import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import axios from "axios";

export function useDisputeChat(disputeId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const socket = io(process.env.NEXT_PUBLIC_API);

  useEffect(() => {
    // Load existing messages
    axios.get(`${process.env.NEXT_PUBLIC_API}/messages/${disputeId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` }
    }).then(res => setMessages(res.data));

    // Join WS room
    socket.emit("joinRoom", disputeId);
    socket.on("newMessage", msg => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off("newMessage");
      socket.disconnect();
    };
  }, [disputeId]);

  const sendMessage = (text: string) => {
    // via REST
    axios.post(`${process.env.NEXT_PUBLIC_API}/messages`, { disputeId, content: text }, {
      headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` }
    });
  };

  return { messages, sendMessage };
}