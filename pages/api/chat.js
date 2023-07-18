import axios from "axios";

export default async (req, res) => {
  const { messages } = req.body;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4",
      messages,
      temperature: 0.3,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    }
  );
  console.log(response.data.error);
  res.status(200).json(response.data);
};
