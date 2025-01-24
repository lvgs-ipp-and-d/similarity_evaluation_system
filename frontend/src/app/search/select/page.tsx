"use client";

import { useState, useEffect } from "react";
import { FaBars, FaTimes, FaHome, FaChevronDown, FaChevronRight } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { FaLayerGroup } from "react-icons/fa";
import { FaRegUserCircle } from "react-icons/fa";
import { IoIosArrowForward } from "react-icons/io";

interface ErrorDetail {
    detail?: string; // サーバーエラーのメッセージが格納されるプロパティ
}

export default function SearchSelect() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [expandedMenu, setExpandedMenu] = useState(null);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [groupList, setGroupList] = useState<{ id: number; name: string }[]>([]);
    const location = useLocation();
    const { user_name = "未設定", user_email = "未設定" } = location.state || {};
    const navigate = useNavigate();

    // グループリスト取得処理
    const fetchGroups = async () => {
        try {
            const response = await fetch("http://localhost:8000/groups?division_name=Default Division", {
                method: "GET",
            });
    
            if (!response.ok) {
                const errorDetail = await response.json();
                console.error("グループ一覧取得失敗:", errorDetail);
                throw new Error(errorDetail.detail || "グループ一覧の取得に失敗しました");
            }
    
            const data = await response.json();
            console.log("取得したグループ一覧:", data.groups);
            setGroupList(data.groups);
        } catch (error) {
            console.error("エラー発生:", error);
            alert("グループ一覧の取得中にエラーが発生しました");
            setGroupList([]); // エラー時も空リストをセット
        }
    };
    

    // 初回レンダリング時にグループリストを取得
    useEffect(() => {
        fetchGroups();
    }, []);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const toggleSubMenu = (menu) => setExpandedMenu(expandedMenu === menu ? null : menu);
    const toggleProfileMenu = () => setIsProfileMenuOpen(!isProfileMenuOpen);
    const handleHomeButtonClick = () => navigate("/home");

    const groupCount = groupList.length;

    // グループ詳細画面へ遷移
    const handleDetailGroup = async (groupId: number) => {
        try {
            const divisionName = "Default Division"; // 必要に応じて取得
            const response = await fetch(`http://localhost:8000/group/${groupId}?division_name=${encodeURIComponent(divisionName)}`, {
                method: "GET",
            });

            // エラーハンドリング
            if (!response.ok) {
                const errorDetail: ErrorDetail = await response.json();
                console.error("グループ詳細取得失敗:", JSON.stringify(errorDetail, null, 2));
                throw new Error(errorDetail.detail || "グループ詳細の取得に失敗しました");
            }

            // データ取得
            const data = await response.json();

            // 結果を使って画面遷移
            navigate("/search/run", {
                state: {
                    user_name,
                    user_email,
                    group_name: data.group.name || "未設定", // サーバーからのデータ
                    files: data.group.files || [], // 空配列をデフォルト
                },
            });            
        } catch (error) {
            console.error("エラー発生:", error);
            alert("グループ詳細の取得に失敗しました");
        }
    };

    // グループ選択削除

    return (
        <div className="h-screen flex flex-col bg-white-500">
            {/* ヘッダー */}
            <header className="flex items-center justify-between bg-blue-500 text-white p-4 shadow-lg">
                {/* 左側にサイドバートグルボタンとロゴ */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleSidebar}
                        className="text-white focus:outline-none hover:bg-blue-700 p-2 rounded-md"
                    >
                        {isSidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
                    </button>
                    <span className="text-2xl font-bold">類似度判定システム</span>
                </div>
                {/* プロフィールボタン */}
                <button
                    onClick={toggleProfileMenu}
                    className="flex items-center justify-center w-10 h-10 bg-white text-blue-500 rounded-full hover:bg-gray-100 focus:outline-none shadow-md"
                >
                    <FaRegUserCircle size={32} />
                </button>
                {isProfileMenuOpen && (
                    <div className="absolute top-16 right-4 w-48 bg-white text-gray-800 rounded-lg shadow-lg">
                        <div className="p-4 border-b border-gray-200 text-center">
                            <p className="font-bold">{user_name}</p>
                            <p className="text-sm text-gray-500">{user_email}</p>
                        </div>
                        <ul className="p-2">
                            <li className="p-2 hover:bg-gray-100 rounded-md cursor-pointer">ログアウト</li>
                        </ul>
                    </div>
                )}
            </header>

            {/* メインレイアウト */}
            <div className="flex flex-1">
                {/* サイドバー */}
                <aside
                    className={`${
                        isSidebarOpen ? "w-96" : "w-16"
                    } transition-all duration-300 bg-blue-700 text-white flex flex-col justify-between`}
                >
                    <div className="flex flex-col gap-4 mt-8">
                    <nav className="flex flex-col">
                            <div
                                className={`flex items-center gap-4 p-3 rounded-md cursor-pointer hover:bg-blue-500 ${
                                    isSidebarOpen ? "justify-start" : "justify-center"
                                }`}
                                onClick={handleHomeButtonClick}
                            >
                                <FaHome size={24} />
                                {isSidebarOpen && <span className="text-lg">ホーム</span>}
                            </div>
                            <div className="relative flex flex-col">
                                <div
                                    onClick={() => toggleSubMenu("groups")}
                                    className={`flex items-center gap-4 p-3 rounded-md cursor-pointer hover:bg-blue-500 ${
                                        isSidebarOpen ? "justify-start" : "justify-center"
                                    }`}
                                >
                                    <FaLayerGroup size={24} />
                                    {!isSidebarOpen && (
                                        <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full transform translate-x-2 -translate-y-2">
                                            {groupCount}
                                        </span>
                                    )}
                                    {isSidebarOpen && (
                                        <div className="flex items-center justify-between w-full">
                                            <span className="text-lg">グループ</span>
                                            {expandedMenu === "groups" ? (
                                                <FaChevronDown size={16} />
                                            ) : (
                                                <FaChevronRight size={16} />
                                            )}
                                        </div>
                                    )}
                                </div>
                                {expandedMenu === "groups" && isSidebarOpen && (
                                    <div className="ml-8 mt-2 flex flex-col gap-2">
                                        {groupList.map((group, index) => (
                                            <div
                                                key={index}
                                                className="p-2 flex items-center gap-2 cursor-pointer hover:bg-blue-500 rounded-md"
                                            >
                                                <FaLayerGroup size={16} color="white" />
                                                <span>{group.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </nav>
                    </div>
                </aside>

                {/* メインコンテンツ */}
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
                            className="text-2xl font-bold text-blue-500"
                        >
                            サーチ
                        </h1>
                    </div>
                    <div className="flex-1 flex justify-center items-center">
                        <div className="w-[90%] h-[90%] bg-white rounded-lg shadow-lg p-8">

                            <div className="mt-4 flex bg-blue-500 justify-between items-center rounded-md p-2">
                                <div className="flex items-center gap-2 ml-4">
                                    <FaLayerGroup size={32} color="white" className="mr-4" />
                                    <div className="text-white">
                                        <p>既存グループ一覧</p>
                                    </div>
                                </div>
                            </div>

                            <div 
                                className="mt-4 overflow-y-auto"
                                style={{
                                    maxHeight: "560px",
                                    paddingRight: "4px",
                                }}
                                >
                                {groupList.map((group, index) => (
                                    <div 
                                        key={index}
                                        className="mt-4 flex justify-between items-center p-2 rounded-md pointer hover:bg-gray-100"
                                    >
                                        <div 
                                            className="flex items-center gap-2 cursor-pointer ml-4"
                                            onClick={() => handleDetailGroup(group.id)}
                                        >
                                            <FaLayerGroup size={32} color="#3b81f6" className="mr-4" />
                                            <div>
                                                <p>{group.name}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
