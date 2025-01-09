"use client";

import { useState, useEffect } from "react";
import { FaBars, FaTimes, FaHome, FaChevronDown, FaChevronRight, FaLayerGroup } from "react-icons/fa";
import { HiUserGroup } from "react-icons/hi";
import { useNavigate, useLocation } from "react-router-dom";
import { FaRegUserCircle } from "react-icons/fa";
import { IoSearchSharp } from "react-icons/io5";
import { HiMiniRectangleGroup } from "react-icons/hi2";
import { MdOutlineCompare } from "react-icons/md";

export default function Home() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [expandedMenu, setExpandedMenu] = useState(null);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const location = useLocation();
    const { user_name = "未設定", user_email = "未設定" } = location.state || {};

    useEffect(() => {
        console.log("受け取ったstate:", location.state);
    }, [location.state]);

    const navigate = useNavigate();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const toggleSubMenu = (menu) => {
        setExpandedMenu(expandedMenu === menu ? null : menu);
    };

    const toggleProfileMenu = () => {
        setIsProfileMenuOpen(!isProfileMenuOpen);
    };

    const handleGroupingButtonClick = () => {
        navigate("/group/select", 
            {
                state: {
                    user_name: user_name,
                    user_email: user_email
                }
            }
        );
    };

    const [groupList, setGroupList] = useState<{ id: number; name: string }[]>([]);

    const groupCount = groupList.length;

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

    // ログアウト処理
    const handleLogout = async () => {
        // ローカルストレージからトークンを削除
        localStorage.removeItem("token");

        // サーバ側にログアウトリクエストを送信
        fetch("http://localhost:8000/auth/logout", {
            method: "POST",
            credentials: "include",
        })
        .then((response) => {
            if (!response.ok) {
                throw new Error("ログアウトリクエストに失敗しました");
            }
            console.log("ログアウト成功");
        })
        .catch((error) => {
            console.error("エラー発生:", error);
        });

        // ログインページにリダイレクト
        navigate("/");
    }

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
                    <span className="flex flex-row items-center text-2xl font-bold"> {/* flex-rowとitems-center、text-4xlを追加 */}
                        <MdOutlineCompare size={40} className="mr-4" />         {/* アイコンとテキストの間隔調整 */}
                        <p>類似度判定システム</p>                     {/* pタグのクラス名を削除 */}
                    </span>
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
                            <li 
                            className="p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                            onClick={handleLogout}
                            >ログアウト</li>
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
                                    <HiUserGroup size={24} />
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
                    <div className="flex justify-self-start">
                        <h1 className="text-2xl font-bold text-blue-500">ホーム</h1>
                    </div>
                    <div className="flex-1 flex justify-center items-center">
                        <div className="w-[90%] h-[90%] bg-white rounded-lg shadow-2xl p-8 flex justify-center items-center">
                            <div className="flex gap-6 justify-center items-center">
                                <button
                                    onClick={handleGroupingButtonClick}
                                    className="w-80 h-80 p-4 text-blue-500 bg-white rounded-lg border-8 border-blue-500 shadow-lg flex flex-col justify-center items-center hover:bg-blue-500 hover:text-white"
                                >
                                    <div className="flex flex-col items-center">
                                        <span className="mb-2 block text-2xl font-bold">グルーピング</span>
                                        <HiMiniRectangleGroup size={118} />
                                    </div>
                                </button>
                                <button
                                    // onClick={handleScoringButtonClick}
                                    className="w-80 h-80 p-4 text-blue-500 bg-white rounded-lg border-8 border-blue-500 shadow-lg flex flex-col justify-center items-center hover:bg-blue-500 hover:text-white"
                                >
                                    <div className="flex flex-col items-center">
                                        <span className="mb-2 block text-2xl font-bold">サーチ</span>
                                        <IoSearchSharp size={118} />
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
