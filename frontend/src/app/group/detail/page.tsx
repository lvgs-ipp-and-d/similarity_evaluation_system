"use client";

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaBars, FaTimes, FaHome, FaLayerGroup, FaFile, FaRegUserCircle } from "react-icons/fa";
import { IoIosArrowForward } from "react-icons/io";
import { MdDownload } from "react-icons/md";

interface File {
    file_id: number;
    file_name: string;
    file_size?: number; // サーバーでオプションの場合に備える
    group_version?: number;
}

export default function GroupDetail() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    const location = useLocation();
    const {
        user_name = "未設定",
        user_email = "未設定",
        group_name = "未設定",
        files = [],
    }: { user_name: string; user_email: string; group_name: string; files: File[] } = location.state || {};

    const navigate = useNavigate();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const toggleProfileMenu = () => setIsProfileMenuOpen(!isProfileMenuOpen);
    const handleHomeButtonClick = () => navigate("/home", { state: { user_name, user_email } });

    // デバッグ用ログ
    console.log("遷移後のlocation.state:", location.state);

    return (
        <div className="h-screen flex flex-col bg-white-500">
            {/* ヘッダー */}
            <header className="flex items-center justify-between bg-blue-500 text-white p-4 shadow-lg">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="text-white focus:outline-none hover:bg-blue-700 p-2 rounded-md">
                        {isSidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
                    </button>
                    <span className="text-2xl font-bold">類似度判定システム</span>
                </div>
                <button onClick={toggleProfileMenu} className="flex items-center justify-center w-10 h-10 bg-white text-blue-500 rounded-full hover:bg-gray-100 focus:outline-none shadow-md">
                    <FaRegUserCircle size={32} />
                </button>
                {isProfileMenuOpen && (
                    <div className="absolute top-16 right-4 w-48 bg-white text-gray-800 rounded-lg shadow-lg">
                        <div className="p-4 border-b border-gray-200 text-center">
                            <p className="font-bold">{user_name}</p>
                            <p className="text-sm text-gray-500">{user_email}</p>
                        </div>
                    </div>
                )}
            </header>

            {/* メインレイアウト */}
            <div className="flex flex-1">
                <aside className={`${isSidebarOpen ? "w-96" : "w-16"} transition-all duration-300 bg-blue-700 text-white flex flex-col justify-between`}>
                    <div className="flex flex-col gap-4 mt-8">
                        <div onClick={handleHomeButtonClick} className="flex items-center gap-4 p-3 rounded-md cursor-pointer hover:bg-blue-500">
                            <FaHome size={24} />
                            {isSidebarOpen && <span className="text-lg">ホーム</span>}
                        </div>
                    </div>
                </aside>

                <main className="flex-1 flex flex-col p-8">
                    <div className="flex items-center gap-2">
                        <h1 
                        className="text-2xl cursor-pointer hover:text-blue-500"
                        onClick={() => navigate("/home", { state: { user_name, user_email } })}
                        >
                            ホーム
                        </h1>
                        <IoIosArrowForward size={32} color="#3b81f6" /> 
                        <h1 
                        className="text-2xl cursor-pointer hover:text-blue-500"
                        onClick={() => navigate("/group/select", { state: { user_name, user_email } })}
                        >
                            グルーピング
                        </h1>
                        <IoIosArrowForward size={32} color="#3b81f6" /> 
                        <h1 
                        className="text-2xl cursor-pointer hover:text-blue-500"
                        onClick={() => navigate("/group/edit", { state: { user_name, user_email } })}
                        >
                            既存グループ一覧
                        </h1>
                        <IoIosArrowForward size={32} color="#3b81f6" />
                        <h1 className="text-2xl font-bold text-blue-500">{group_name}</h1>
                    </div>
                    <div className="flex-1 flex justify-center items-center">
                        <div className="w-[90%] h-[90%] bg-white rounded-lg shadow-lg p-8">
                            <button
                                className="w-40 font-bold flex items-center justify-center gap-2 bg-green-500 text-white hover:bg-green-600 rounded-md p-2 justify-self-end"
                            >
                                <MdDownload />
                                ダウンロード
                            </button>

                            <div className="mt-4 flex bg-blue-500 justify-between items-center rounded-md p-2">
                                {/* グループ名 */}
                                <div className="flex items-center gap-2 ml-4">
                                    <FaLayerGroup size={32} color="white" className="mr-4" />
                                    <div className="text-white">
                                        <p>グループ名：{group_name}</p>
                                    </div>
                                </div>
                                {/* 総データ量 */}
                                <div>
                                    <p className="text-white mr-4">総データ量：0.00 GB</p>
                                </div>
                            </div>

                            <div className="mt-4 overflow-y-auto" style={{ maxHeight: "560px", paddingRight: "4px" }}>
                                {files.length > 0 ? (
                                    files.map((file: File) => (
                                        <div 
                                            key={file.file_id} 
                                            className="mt-4 flex justify-between items-center p-2 rounded-md"
                                        >
                                            <div className="flex items-center gap-2 ml-4">
                                                <FaFile size={32} color="#3b81f6" className="mr-4" />
                                                <div>
                                                    <p> {file.file_name}</p>
                                                    <p className="text-sm text-gray-500">
                                                        100KB
                                                    </p>
                                                    {file.file_size && <p>ファイルサイズ: {file.file_size} KB</p>}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500">ファイルがありません</p>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
