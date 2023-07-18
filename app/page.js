import HomePage from "./home-page";

async function getAgents() {
  const DOMAIN = process.env.FRESHDESK_DOMAIN;
  const API_KEY = process.env.FRESHDESK_API_KEY;
  const PER_PAGE = 100;

  let page = 1;
  let allAgents = [];

  const response = await fetch(
    `https://${DOMAIN}.freshdesk.com/api/v2/agents?page=${page}&per_page=${PER_PAGE}`,
    {
      method: "GET",
      headers: {
        Authorization: "Basic " + btoa(API_KEY + ":" + "x"),
      },
    }
  );

  const agents = await response.json();
  //console.log(agents);

  // while (true) {
  //   const response = await fetch(
  //     `https://${DOMAIN}.freshdesk.com/api/v2/agents?page=${page}&per_page=${PER_PAGE}`,
  //     {
  //       method: "GET",
  //       headers: {
  //         Authorization: "Basic " + btoa(API_KEY + ":" + "x"),
  //       },
  //     }
  //   );
  //   console.log(response);
  //   allAgents = [...allAgents, ...response];

  //   // If the number of results is less than the maximum, we've reached the last page
  //   if (response.length < PER_PAGE) {
  //     break;
  //   }

  //   page++;
  // }

  //res.status(200).json(allAgents);

  return agents;
}

export default async function Page() {
  const agents = await getAgents();
  // console.log(agents);
  // return (
  //   <div>
  //     <ul>
  //       {agents.map((agent) => (
  //         <li key={agent.id}>{agent.contact.name}</li>
  //       ))}
  //     </ul>
  //   </div>
  // );
  return <HomePage agents={agents} />;
}
