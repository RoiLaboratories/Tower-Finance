"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { tokens } from "@/mockData/token";
import { TokenDropdown } from "./TokenDropdown";
import { FrequencyField } from "./FrequencyField";
import { AmountInput } from "./AmountInput";

export const RecurringBuys = () => {
  const [selectedPayToken, setSelectedPayToken] = useState(tokens[0]);
  const [selectedBuyToken, setSelectedBuyToken] = useState(null);
  const [amount] = useState("10.00");
  const [frequency] = useState("Weekly");
  const [endDate] = useState("Weekly");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-6 space-y-5 border border-zinc-800/30"
    >
      <AmountInput amount={amount} readOnly />

      <TokenDropdown
        label="Pay With"
        selected={selectedPayToken}
        onSelect={setSelectedPayToken}
        showInfo
      />

      <TokenDropdown
        label="Buy"
        selected={selectedBuyToken}
        onSelect={setSelectedBuyToken}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FrequencyField label="Pay With" value={frequency} showInfo />
        <FrequencyField label="End Date" value={endDate} showInfo optional />
      </div>

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-100 transition-colors text-sm mt-2"
      >
        Continue
      </motion.button>
    </motion.div>
  );
};
