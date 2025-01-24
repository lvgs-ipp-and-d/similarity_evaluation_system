"use client";

import React from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
    const navigate = useNavigate();

    const handleSuccess = async (credentialResponse: { credential?: string }) => {
        try {
            console.log("成功", credentialResponse);

            // トークンを取得
            const token = credentialResponse.credential;
            if (!token) {
                throw new Error("Credential is undefined");
            }

            // トークンをバクエンドに送信
            const response = await fetch("http://localhost:8000/auth/google", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ token }),
            });

            // エラーハンドリング
            if (!response.ok) {
                throw new Error("バックエンドの通信エラー");
            }

            //  ユーザー情報を取得
            const data = await response.json();
            const userInfo = data.user_info;

            // 認証成功時に/homeにリダイレクト
            navigate("/SignIn",
                {
                    state: {
                        user_name: userInfo.name,
                        user_email: userInfo.email
                    }
                }
            );
        } catch (error) {
            console.error("エラー発生:", error);
        }
    };

    const handleErr = () => {
        console.error("Googleログイン失敗");
    };

    return (
        <GoogleOAuthProvider clientId="878970328790-042rmsh815pl6lo078jokinatuqsliuc.apps.googleusercontent.com">
            <div className="h-screen flex flex-col bg-gray-100">
                {/* ヘッダー */}
                <header className="flex items-center justify-center bg-blue-500 text-white p-4 shadow-lg">
                    <span className="text-2xl font-bold">類似度判定システム</span>
                </header>

                {/* メインコンテンツ */}
                <main className="flex-1 flex flex-col justify-center items-center">
                    <div className="bg-white p-8 rounded-lg shadow-lg w-96">
                        <h1 className="text-2xl font-bold mb-6 text-center text-blue-500">ログイン</h1>
                        <div className="flex justify-center">
                            <GoogleLogin onSuccess={handleSuccess} onError={handleErr} />
                        </div>
                    </div>
                </main>
            </div>
        </GoogleOAuthProvider>
    );
}