"use client";

import React, { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function SignIn() {
    const [division, setDivision] = useState<Divisions | undefined>(undefined);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [securityLevel, setSecurityLevel] = useState(0);
    const navigate = useNavigate();

    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setDivision(event.target.value as Divisions);
    };

    const calculateSecurityLevel = (password: string): number => {
        const conditions = [
            password.length >= 8,
            /\d/.test(password),
            /[A-Z]/.test(password),
            /[a-z]/.test(password),
            /[^a-zA-Z0-9]/.test(password),
        ];
        return conditions.filter(Boolean).length;
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPassword = e.target.value;
        setPassword(newPassword);
        setSecurityLevel(calculateSecurityLevel(newPassword));
    };

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            <header className="flex items-center justify-center bg-blue-500 text-white p-4 shadow-lg">
                <span className="text-2xl font-bold">類似度判定システム</span>
            </header>

            <main className="flex-1 flex flex-col justify-center items-center">
                <div className="bg-white p-8 rounded-lg shadow-lg w-96">
                    <h1 className="text-2xl font-bold mb-6 text-center text-blue-500">新規アカウント登録</h1>

                    <div className="mb-4">
                        <label htmlFor="division-select" className="block text-sm text-gray-500 mb-2">
                            事業部
                        </label>
                        <select
                            id="division-select"
                            value={division || ""}
                            onChange={handleChange}
                            required
                            className="w-full h-10 border border-gray-300 rounded-lg p-2"
                        >
                            <option value="" disabled>
                                事業部を選択してください
                            </option>
                            {Object.values(Divisions).map((division) => (
                                <option key={division} value={division}>
                                    {division}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="password" className="block text-sm text-gray-500 mb-2">
                            パスワード
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={handlePasswordChange}
                                className="w-full h-10 border border-gray-300 rounded-lg p-2 pr-10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                                aria-label={showPassword ? "パスワードを非表示" : "パスワードを表示"}
                            >
                                {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                            </button>
                        </div>
                    </div>

                    <SecurityLevelBar level={securityLevel} />

                    <div className="flex justify-center">
                        <button
                            className={`mt-4 font-bold text-white rounded-lg p-2 w-full cursor-pointer ${securityLevel < 3 || !division ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'}`}
                            disabled={securityLevel < 3 || !division}
                            onClick={() => navigate("/home")}
                            >
                            登録
                        </button>
                    </div>

                </div>
            </main>
        </div>
    );
}

function SecurityLevelBar({ level }: { level: number }) {
    const colors = ["bg-gray-300", "bg-red-500", "bg-red-500", "bg-yellow-500", "bg-green-500", "bg-green-500"];
    return (
        <div className="mb-4">
            <div className="w-full h-2 bg-gray-300 rounded-lg overflow-hidden">
                <div
                    className={`h-full ${colors[level] || "bg-gray-300"}`}
                    style={{ width: `${(level / 5) * 100}%` }}
                />
            </div>
            <p className="text-sm mt-2 text-gray-500">
                {level === 0 ? "パスワードを入力してください" : level < 3 ? "セキュリティレベル：弱い" : level === 3 ? "セキュリティレベル：普通" : "セキュリティレベル：強い"}
            </p>
        </div>
    );
}

enum Divisions {
    類似度判定システム = "類似度判定システム",
    レバウェル = "レバウェル",
    MergerX = "MergerX",
    Atsys = "Atsys",
}
