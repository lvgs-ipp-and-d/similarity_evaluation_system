"use client";

import { useEffect, useState } from "react";
import { FaBars, FaTimes, FaHome, FaChevronDown, FaChevronRight, FaLayerGroup } from "react-icons/fa";
import { HiUserGroup } from "react-icons/hi";
import { useNavigate, useLocation } from "react-router-dom";
import { IoMdAddCircle } from "react-icons/io";
import { IoListCircleSharp } from "react-icons/io5";
import { FaRegUserCircle } from "react-icons/fa";
import { IoIosArrowForward } from "react-icons/io";

export default function GroupSelect() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [expandedMenu, setExpandedMenu] = useState(null);
    const [expandedSubMenu, setExpandedSubMenu] = useState(null);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [groupList, setGroupList] = useState<{ id: number; name: string; }[]>([]); // 型を修正
    const location = useLocation();
    const { user_name, user_email } = location.state || {};
    const navigate = useNavigate();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const toggleSubMenu = (menu) => setExpandedMenu(expandedMenu === menu ? null : menu);
    const toggleChildMenu = (subMenu) => setExpandedSubMenu(expandedSubMenu === subMenu ? null : subMenu);
    const toggleProfileMenu = () => setIsProfileMenuOpen(!isProfileMenuOpen);
    const openPopup = () => setIsPopupOpen(true);
    const closePopup = () => setIsPopupOpen(false);
    const handleInputChange = (e) => setGroupName(e.target.value);

    const handleHomeButtonClick = () => navigate("/home");

    const handleNewGroupButtonClick = () => openPopup();

    // グループ作成処理
    const handleCreateGroup = async (groupName: string) => {

        // グループ名が空の場合はアラートを表示
        if (!groupName.trim()){
            alert("グループ名を入力してください");
            return;
        }

        try {

            const response = await fetch("http://localhost:8000/group", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                    division_name: "Default Division",
                    group_name: groupName,
                }),
            });

            if (!response.ok) {
                const errorDetail = await response.json();
                throw new Error(errorDetail.detail || "バックエンドの通信エラー");
            }

            const data = await response.json();
            const { group_id } = data;

            // 登録成成功時に/runにリダイレクト
            navigate("/run", {
                state: { 
                    user_name: user_name,
                    user_email: user_email,
                    group_id,
                    group_name: groupName,
                    division_name: "Default Division",
                },
            });
        } catch (error) {
            console.error("エラー発生:", error);
        }
    };

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

    const handleExistingGroupButtonClick = () => navigate("/edit", { state: { user_name, user_email } });

    const groupCount = groupList.length;

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
                    <span className="text-2xl font-bold">
                        類似度判定システム
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
                    <div className="flex items-center gap-2">
                        <h1 
                        className="text-2xl cursor-pointer hover:text-blue-500"
                        onClick={() => navigate("/home", { state: { user_name, user_email } })}
                        >
                            ホーム
                        </h1>
                        <IoIosArrowForward size={32} color="#3b81f6" /> 
                        <h1 className="text-2xl font-bold text-blue-500">グルーピング</h1>
                    </div>
                    <div className="flex-1 flex justify-center items-center">
                        <div className="w-[90%] h-[90%] bg-white rounded-lg shadow-2xl p-8 flex justify-center items-center">
                            <div className="flex gap-6 justify-center items-center">
                                <button
                                    onClick={handleNewGroupButtonClick}
                                    className="w-80 h-80 p-4 text-blue-500 bg-white rounded-lg border-8 border-blue-500 shadow-lg flex flex-col justify-center items-center hover:bg-blue-500 hover:text-white"
                                >
                                    <span className="mb-2 block text-2xl font-bold">新規グループ作成</span>
                                    <IoMdAddCircle size={118} />
                                </button>
                                <button
                                    onClick={handleExistingGroupButtonClick}
                                    className="w-80 h-80 p-4 text-blue-500 bg-white rounded-lg border-8 border-blue-500 shadow-lg flex flex-col justify-center items-center hover:bg-blue-500 hover:text-white"
                                >
                                    <span className="mb-2 block text-2xl font-bold">既存グループ編集</span>
                                    <IoListCircleSharp size={118} />
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* ポップアップ */}
            {isPopupOpen && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white p-8 rounded-lg shadow-lg w-96">
                        <h2 className="text-xl font-bold mb-4 text-center">新しいグループ名を入力</h2>
                        <input
                            type="text"
                            value={groupName}
                            onChange={handleInputChange}
                            className="w-full p-3 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                            placeholder="グループ名を入力"
                        />
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={closePopup}
                                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={() => handleCreateGroup(groupName)}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                作成
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
