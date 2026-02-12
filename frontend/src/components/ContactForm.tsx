"use client";

import { useState } from "react";
import { Send, Check, AlertCircle } from "lucide-react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError("");

    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: "Failed to send message" }));
        throw new Error(data.detail || "Failed to send message");
      }

      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Message sent!</h3>
        <p className="text-gray-600 text-sm">We'll get back to you as soon as possible.</p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm text-blue-600 hover:text-blue-500 font-medium"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status === "error" && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-colors"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-colors"
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-1">
          Message
        </label>
        <textarea
          id="contact-message"
          required
          rows={4}
          maxLength={5000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-colors resize-none"
        />
      </div>
      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Send className="h-4 w-4" />
        {status === "sending" ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
