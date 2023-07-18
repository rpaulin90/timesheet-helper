"use client";

import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function HomePage(props) {
  const [tickets, setTickets] = useState([]);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [hasSearched, setHasSearched] = useState(false); // New state variable

  function handleError(err) {
    console.log("Ohhhh nooo");
    console.log(err);
  }

  const handleClick = async () => {
    setLoading(true);
    setHasSearched(true); // Set to true when the button is clicked
    console.log(date);
    console.log(selectedAgent);
    const response = await axios
      .get(`/api/tickets?date=${date}&agent_id=${selectedAgent}`)
      .catch(handleError);
    setTickets(response.data);
    setLoading(false);
  };

  return (
    <div className="prose max-w-none p-5">
      <h1 className="text-4xl mb-4">Updated Freshdesk Tickets</h1>
      <div className="flex items-end mb-4">
        <input
          type="date"
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-300 p-2 rounded mr-4"
        />
        <select
          onChange={(e) => setSelectedAgent(e.target.value)}
          className="border border-gray-300 p-2 rounded mr-4"
        >
          <option value="">Select agent</option>
          {props.agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.contact.email}
            </option>
          ))}
        </select>
        <button
          onClick={handleClick}
          className="bg-blue-600 text-white p-2 rounded"
        >
          Get Tickets
        </button>
      </div>
      {loading && (
        <div className="flex justify-center mt-3">
          <div className="w-6 h-6 border-t-2 border-blue-500 rounded-full animate-spin"></div>
        </div>
      )}
      {hasSearched &&
        !loading &&
        tickets &&
        Object.keys(tickets).length === 0 && (
          <p>No conversations were retrieved.</p>
        )}
      {!loading &&
        Object.keys(tickets)
          .sort((a, b) => new Date(a) - new Date(b)) // sort the dates in ascending order
          .map((date) => (
            <div key={date} className="mb-8">
              <h2 className="text-3xl mb-2">Date: {date}</h2>
              {Object.keys(tickets[date]).map((company) => (
                <div key={company} className="mb-6 ml-8">
                  <h3 className="text-2xl mb-1">Company: {company}</h3>
                  {Object.keys(tickets[date][company]).map((ticketNumber) => (
                    <div key={ticketNumber} className="mb-4 ml-8">
                      <h4 className="text-xl mb-1">
                        Ticket Number: {ticketNumber}
                      </h4>
                      {tickets[date][company][ticketNumber].map(
                        (conversation) => (
                          <div
                            key={conversation.id}
                            className="border border-gray-200 p-4 rounded mb-4"
                          >
                            <p>User ID: {conversation.user_id}</p>
                            <p>
                              Is Agent:{" "}
                              {conversation.user_is_agent ? "Yes" : "No"}
                            </p>
                            {conversation.user_is_agent && (
                              <p>Agent Email: {conversation.user_email}</p>
                            )}
                            <p>Conversation: {conversation.body_text}</p>
                            <div className="border-t border-gray-200 pt-2 mt-2">
                              AI Summary:
                              <ReactMarkdown
                                children={conversation.ai_summary}
                                remarkPlugins={[remarkGfm]}
                              />
                            </div>
                            {/* <div className="border-t border-gray-200 pt-2 mt-2">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              AI Summary: {conversation.ai_summary}
                            </ReactMarkdown>
                          </div> */}
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
    </div>
  );
}
