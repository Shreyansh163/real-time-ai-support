const { io } = require("socket.io-client");

const socket = io("http://localhost:3000", {
  extraHeaders: {
    Authorization:
      "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlZGFjMjk0Mi1kYWMzLTQ4M2EtYjA4MS0xMjkxZDY2ZDNiNDUiLCJyb2xlIjoiQ1VTVE9NRVIiLCJlbWFpbCI6ImN1c3RvbWVyQHRlc3QuY29tIiwiaWF0IjoxNzcxNzU2Mjg5LCJleHAiOjE3NzE3NTk4ODl9.suApR2BwV7ZUQ9Oy0hLGhf7RRBFHqCTf6Aolm4GsIJw",
  },
});

socket.on("connect", () => {
  console.log("✅ connected");

  // STEP 1: join conversation room
  socket.emit("join_conversation", "39ce37c8-b630-45fd-be8e-424e1eae3320");

  // STEP 2: send message

  socket.emit("send_message", {
    conversationId: "39ce37c8-b630-45fd-be8e-424e1eae3320",
    message: "The payment was deducted but order not confirmed",
  });
});

socket.on("receive_message", data => {
  console.log("📩 received:", data);
});

socket.on("connect_error", err => {
  console.error("❌ connection error:", err.message);
});





