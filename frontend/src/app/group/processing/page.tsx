"use client";

import { useState, useEffect } from "react";
import { FaBars, FaTimes, FaHome, FaChevronDown, FaChevronRight, FaLayerGroup } from "react-icons/fa";
import { FaRegUserCircle } from "react-icons/fa";
import { IoIosArrowForward } from "react-icons/io";

// タスクの型定義
interface Task {
    id: string; // タスクID
    status: "PENDING" | "SUCCESS" | "FAILURE" | string; // ステータス
    group_name: string; // グループ名
    files: { filename: string; file_size: number }[]; // ファイル情報
}

export default function ProcessingGroups() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [expandedMenu, setExpandedMenu] = useState(null);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const toggleSubMenu = (menu) => {
        setExpandedMenu(expandedMenu === menu ? null : menu);
    };

    const toggleProfileMenu = () => {
        setIsProfileMenuOpen(!isProfileMenuOpen);
    };

    // タスク一覧取得処理
    const fetchTasks = async () => {
        try {
            const response = await fetch("http://localhost:8000/tasks");
    
            if (!response.ok) {
                const errorDetail = await response.json();
                console.error("サーバーエラー:", errorDetail.detail || "タスク一覧の取得に失敗しました");
                throw new Error(errorDetail.detail || "タスク一覧の取得に失敗しました");
            }
    
            const data = await response.json();
            console.log("取得したタスク:", data.tasks); // ここでログを確認
            setTasks(data.tasks);
        } catch (error) {
            console.error("タスク一覧取得エラー:", error);
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };    

    // 完了タスクの削除
    // const removeCompletedTask = (taskId: string) => {
    //     setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
    // };

    // 定期的にタスク一覧を取得
    useEffect(() => {
        const intervalId = setInterval(fetchTasks, 5000);
        return () => clearInterval(intervalId);
    }, []);

    // 初回レンダリング時にタスク一覧を取得
    useEffect(() => {
        fetchTasks();
    }, []);

    return (
        <div className="h-screen flex flex-col bg-white-500">
            {/* ヘッダー */}
            <header className="flex items-center justify-between bg-blue-500 text-white p-4 shadow-lg">
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleSidebar}
                        className="text-white focus:outline-none hover:bg-blue-700 p-2 rounded-md"
                    >
                        {isSidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
                    </button>
                    <span className="flex flex-row items-center text-2xl font-bold">
                        <p>類似度判定システム</p>
                    </span>
                </div>
                <button
                    onClick={toggleProfileMenu}
                    className="flex items-center justify-center w-10 h-10 bg-white text-blue-500 rounded-full hover:bg-gray-100 focus:outline-none shadow-md"
                >
                    <FaRegUserCircle size={32} />
                </button>
                {isProfileMenuOpen && (
                    <div className="absolute top-16 right-4 w-48 bg-white text-gray-800 rounded-lg shadow-lg">
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
                    {/* サイドバー省略 */}
                </aside>

                {/* メインコンテンツ */}
                <main className="flex-1 flex flex-col p-8">
                    <div className="flex justify-self-start">
                        <h1 className="text-2xl cursor-pointer hover:text-blue-500">ホーム</h1>
                        <IoIosArrowForward size={32} color="#3b81f6" />
                        <h1 className="text-2xl cursor-pointer hover:text-blue-500">グルーピング</h1>
                        <IoIosArrowForward size={32} color="#3b81f6" />
                        <h1 className="text-2xl font-bold text-blue-500">実行中タスク一覧</h1>
                    </div>
                    <div className="flex-1 flex justify-center items-center mt-8">
                        <div className="w-[90%] h-[90%] bg-white rounded-lg shadow-2xl p-8 overflow-y-auto">
                            {loading ? (
                                <p className="text-blue-500 text-lg">タスクを取得中...</p>
                            ) : tasks.length === 0 ? (
                                <p className="text-gray-600 text-lg">現在、処理中のタスクはありません。</p>
                            ) : (
                                <table className="table-auto w-full border-collapse border border-gray-300 rounded-lg overflow-hidden">
                                    <thead>
                                        <tr className="bg-blue-500 text-white">
                                            <th className="border px-4 py-2 text-left first:rounded-tl-lg last:rounded-tr-lg">グループ名</th>
                                            <th className="border px-4 py-2 text-left">タスクID</th> 
                                            <th className="border px-4 py-2 text-left">ファイル名</th>
                                            <th className="border px-4 py-2 text-left">ファイルサイズ（bytes）</th>
                                            <th className="border px-4 py-2 text-left">ステータス</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-800">
                                        {tasks.map((task, index) => (
                                            <tr
                                                key={task.id}
                                                className={index % 2 === 0 ? "bg-blue-100" : ""}
                                            >
                                                <td className="border px-4 py-2">{task.group_name || "未設定"}</td>
                                                <td className="border px-4 py-2">{task.id}</td>
                                                <td className="border px-4 py-2">
                                                    {task.files?.length > 0 ? (
                                                        task.files.map((file, idx) => (
                                                            <div key={idx}>
                                                                {file.filename ? `${file.filename}` : "ファイル名なし"}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div>ファイル情報なし</div>
                                                    )}
                                                </td>
                                                <td className="border px-4 py-2">
                                                    {task.files?.length > 0 ? (
                                                        task.files.map((file, idx) => (
                                                            <div key={idx}>
                                                                {file.file_size ? `${file.file_size}` : "サイズ情報なし"}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div>サイズ情報なし</div>
                                                    )}
                                                </td>
                                                <td
                                                    className={`border px-4 py-2 font-bold ${
                                                        task.status === "SUCCESS"
                                                            ? "text-green-600"
                                                            : ["PENDING", "STARTED"].includes(task.status)
                                                            ? "text-blue-600"
                                                            : task.status === "FAILURE"
                                                            ? "text-red-600"
                                                            : "text-gray-600"
                                                    }`}
                                                >
                                                    {
                                                        task.status === "SUCCESS"
                                                        ? "完了"
                                                        : ["PENDING", "STARTED"].includes(task.status)
                                                        ? "処理中"
                                                        : task.status === "FAILURE"
                                                        ? "エラー"
                                                        : `不明 (${task.status || "未設定"})`
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
