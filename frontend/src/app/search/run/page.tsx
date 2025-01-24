"use client";

import { useState, useEffect } from "react";
import { FaBars, FaTimes, FaHome, FaChevronDown, FaChevronRight } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { FaLayerGroup } from "react-icons/fa";
import { FaFile } from "react-icons/fa";
import { FaRegUserCircle } from "react-icons/fa";
import { IoIosArrowForward } from "react-icons/io";

export default function SearchRun() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [expandedMenu, setExpandedMenu] = useState(null);
    // const [expandedSubMenu, setExpandedSubMenu] = useState(null);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [uploadedFiles, setUploadFiles] = useState<File[]>([]);
    const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
    const [fileToDeleteIndex, setFileToDeleteIndex] = useState<number | null>(null);
    const [groupList, setGroupList] = useState<{ id: number; name: string }[]>([]);
    const location = useLocation();
    const { group_id = 0, group_name = "未設定" } = location.state || {};
    const [isLoading, setIsLoading] = useState(false);
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
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const files = Array.from(event.target.files);
            setUploadFiles((prevFiles) => [...prevFiles, ...files]);
        }
    };
    const confirmDeleteFile = (index: number) => {
        setFileToDeleteIndex(index);
        setIsDeletePopupOpen(true);
    };
    const handleDeleteConfirmed = () => {
        if (fileToDeleteIndex !== null) {
            setUploadFiles((prevFiles) => prevFiles.filter((_, i) => i !== fileToDeleteIndex));
        }
        setIsDeletePopupOpen(false);
        setFileToDeleteIndex(null);
    };
    const handleDeleteCancelled = () => {
        setIsDeletePopupOpen(false);
        setFileToDeleteIndex(null);
    };

    const groupCount = groupList.length;

    // サーチ実行処理
    const handleSearch = async (group_id: number, group_name: string) => {
        if (uploadedFiles.length === 0) {
            alert("ファイルを選択してください");
            return;
        }
    
        const selectedGroup = {
            id: group_id,
            name: group_name,
            division: "Default Division",
        };
    
        const formData = new FormData();
        uploadedFiles.forEach((file) => formData.append("files", file));
        formData.append("group_id", selectedGroup.id.toString());
        formData.append("group_name", selectedGroup.name);
        formData.append("division_name", selectedGroup.division);
    
        try {
            setIsLoading(true);
            const response = await fetch("http://localhost:8000/search/process", {
                method: "POST",
                body: formData,
            });
    
            if (!response.ok) {
                const errorDetail = await response.json();
                console.error("サーチ実行失敗:", errorDetail);
                throw new Error(errorDetail.detail || "サーチの実行に失敗しました");
            }
    
            // ファイルのダウンロード処理
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "search_results.json";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url); // メモリの解放
    
            alert("サーチが完了しました");

        } catch (error) {
            console.error("エラー発生:", error);
            alert("サーチ中にエラーが発生しました");
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="h-screen flex flex-col bg-white-500">
            
            {/* ローディング画面 */}
            {isLoading && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50">
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-white mt-4 text-lg font-semibold">サーチング...</p>
                    </div>
                </div>
            )}


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
                        onClick={() => navigate("/home", {state: {user_name, user_email}})}
                        >
                            ホーム
                        </h1>
                        <IoIosArrowForward size={32} color="#3b81f6" /> 
                        <h1 
                        className="text-2xl cursor-pointer hover:text-blue-500"
                        onClick={() => navigate(
                            "/search/select", 
                            {state: {user_name, user_email}}
                        )}
                        >
                            サーチ
                        </h1>
                        <IoIosArrowForward size={32} color="#3b81f6" /> 
                        <h1 className="text-2xl font-bold text-blue-500">{group_name}</h1>
                    </div>
                    <div className="flex-1 flex justify-center items-center">
                        <div className="w-[90%] h-[90%] bg-white rounded-lg shadow-lg p-8">
                            <div className="flex gap-4 justify-self-end">
                                <label className="w-40 bg-gray-500 text-white font-bold p-2 rounded-md hover:bg-gray-600 cursor-pointer text-center">
                                    ファイルを選択
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </label>
                                <button 
                                    className="w-40 bg-orange-500 text-white font-bold p-2 rounded-md hover:bg-orange-600"
                                    onClick={() => handleSearch(group_id, group_name)}
                                >
                                    サーチ実行
                                </button>
                            </div>

                            <div className="mt-4 flex bg-blue-500 justify-between items-center rounded-md p-2">
                                {/* グループ名 */}
                                <div className="flex items-center gap-2 ml-4">
                                    <FaLayerGroup size={32} color="white" className="mr-4" />
                                    <div className="text-white">
                                        <p>グループ名：{group_name}</p>
                                    </div>
                                </div>
                                {/* 総データ量 */}
                                <div className="mr-4">
                                    <p className="text-white">総データ量：0.00 GB</p>
                                </div>
                            </div>

                            <div className="mt-4">
                                {uploadedFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className="mt-4 flex justify-between items-center rounded-md p-2 shadow-md"
                                    >
                                        <div className="flex items-center gap-2 ml-4">
                                            <FaFile size={32} color="#3b81f6" className="mr-4" />
                                            <div>
                                                <p>{file.name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {(file.size / 1024).toFixed(2)} KB
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            <button
                                                onClick={() => confirmDeleteFile(index)}
                                                className="w-16 bg-red-500 text-white font-bold p-2 rounded-md hover:bg-red-600 mr-4"
                                            >
                                                削除
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* 削除確認ポップアップ */}
            {isDeletePopupOpen && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white p-8 rounded-lg shadow-lg w-96">
                        <h2 className="text-xl font-bold mb-4 text-center">
                            {fileToDeleteIndex !== null && uploadedFiles[fileToDeleteIndex]
                                ? `${uploadedFiles[fileToDeleteIndex].name} を削除しますか？`
                                : "ファイルを削除しますか？"}
                        </h2>
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={handleDeleteCancelled}
                                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleDeleteConfirmed}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                                削除
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
