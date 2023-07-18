import axios from "axios";

export default async (req, res) => {
  const { date, agent_id } = req.query;
  const DOMAIN = process.env.FRESHDESK_DOMAIN;
  const API_KEY = process.env.FRESHDESK_API_KEY;
  const PER_PAGE = 100; // Maximum allowed by Freshdesk API
  let apiCallsCount = 0; // Counter for API calls

  // Function to fetch paginated data
  const fetchPaginatedData = async (url, params = {}) => {
    let page = 1;
    let aggregatedData = [];

    while (true) {
      apiCallsCount++; // Increase the counter with each API call
      const response = await axios.get(
        `${url}?page=${page}&per_page=${PER_PAGE}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(`${API_KEY}:X`).toString(
              "base64"
            )}`,
          },
          params,
        }
      );

      aggregatedData = [...aggregatedData, ...response.data];

      // If the number of results is less than the maximum, we've reached the last page
      if (response.data.length < PER_PAGE) {
        break;
      }

      page++;
    }

    return aggregatedData;
  };

  // Fetch all companies
  const companies = await fetchPaginatedData(
    `https://${DOMAIN}.freshdesk.com/api/v2/companies`
  );
  const companyMap = companies.reduce(
    (map, company) => ({ ...map, [company.id]: company.name }),
    {}
  );

  // Fetch all agents
  const agents = await fetchPaginatedData(
    `https://${DOMAIN}.freshdesk.com/api/v2/agents`
  );
  const agentMap = agents.reduce(
    (map, agent) => ({ ...map, [agent.id]: agent.contact.email }),
    {}
  );

  // Fetch tickets updated since the provided date
  const tickets = await fetchPaginatedData(
    `https://${DOMAIN}.freshdesk.com/api/v2/tickets`,
    { updated_since: date }
  );

  let groupedConversations = {};

  for (const ticket of tickets) {
    const conversations = await fetchPaginatedData(
      `https://${DOMAIN}.freshdesk.com/api/v2/tickets/${ticket.id}/conversations`
    );

    ticket.company_name = companyMap[ticket.company_id] || "N/A";

    let phrases = [
      "thanks",
      "best regards",
      "happy Monday",
      "happy Friday",
      "cheers",
      "thank you!",
      "have a great",
      "have a good",
      "enjoy your",
    ];
    let pattern = phrases
      .map((phrase) => phrase.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    let regex = new RegExp(`\\s*(?:${pattern})[\\s\\S]*`, "im");

    // Add conversations to the ticket, filtering out conversations not updated since the provided date
    ticket.conversations = conversations
      .filter(
        (conversation) =>
          new Date(conversation.updated_at) >= new Date(date) &&
          conversation.user_id.toString() === agent_id
      )
      .map((conversation) => {
        // Remove the undesired phrases from the body_text
        let cleanedBodyText = conversation.body_text.replace(regex, "");
        return {
          body_text: cleanedBodyText,
          user_id: conversation.user_id,
          user_is_agent: !!agentMap[conversation.user_id],
          user_email: agentMap[conversation.user_id] || "N/A",
          updated_at: conversation.updated_at,
        };
      });

    // Check if there are any conversations left for this ticket after filtering
    // If not, skip to the next ticket
    if (ticket.conversations.length === 0) {
      continue;
    }

    // Group conversations by date and combine the body_text
    let groupedConversationsByDate = {};

    for (let conversation of ticket.conversations) {
      let dateKey = new Date(conversation.updated_at)
        .toISOString()
        .slice(0, 10); // Extract just the date part

      // If the date key doesn't exist in the map, create it
      if (!groupedConversationsByDate[dateKey]) {
        groupedConversationsByDate[dateKey] = {
          body_text: "",
          user_id: conversation.user_id,
          user_is_agent: conversation.user_is_agent,
          user_email: conversation.user_email,
          updated_at: dateKey,
        };
      }

      // Append the new conversation to the existing conversations for that date
      groupedConversationsByDate[
        dateKey
      ].body_text += `message at ${conversation.updated_at}: ${conversation.body_text}\n`;
    }

    // Convert the groupedConversationsByDate object into an array
    ticket.conversations = Object.values(groupedConversationsByDate);

    // Request to OpenAI's Chat Model API
    for (let conversation of ticket.conversations) {
      const prompt = `You are a consultant reviewing your notes and messages to your clients. You need to use this information to write what you did during that day so your client can approve your time. Your summary should be less that 500 characters (counting spaces) and you should use bullet points. Answer using markdown code.\n\nBeginning of message: ${conversation.body_text}`;
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo-16k",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        }
      );

      conversation.ai_summary = response.data.choices[0].message.content;
    }

    // Group the conversations by date, then by company, then by ticket number
    for (let conversation of ticket.conversations) {
      const dateKey = conversation.updated_at; // Extract the date part
      const companyKey = ticket.company_name;
      const ticketKey = ticket.id.toString();

      if (!groupedConversations[dateKey]) {
        groupedConversations[dateKey] = {};
      }
      if (!groupedConversations[dateKey][companyKey]) {
        groupedConversations[dateKey][companyKey] = {};
      }
      if (!groupedConversations[dateKey][companyKey][ticketKey]) {
        groupedConversations[dateKey][companyKey][ticketKey] = [];
      }
      groupedConversations[dateKey][companyKey][ticketKey].push(conversation);
    }
  }

  console.log(`Total API calls made: ${apiCallsCount}`); // Log the number of API calls made
  console.log(groupedConversations);
  res.status(200).json(groupedConversations);
};
