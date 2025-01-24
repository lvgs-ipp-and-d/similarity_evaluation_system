"use client";

import { useState } from "react";
import { FaBars, FaTimes, FaRegUserCircle } from "react-icons/fa";

export default function Admin() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const toggleProfileMenu = () => {
        setIsProfileMenuOpen(!isProfileMenuOpen);
    };

    // サンプルデータ
    const data = [
        { id: 1, name: 'Alice', division: 'レバウェル', email: 'sample1@mail.com' },
        { id: 2, name: 'Bob', division: 'Atsys', email: 'sample2@mail.com' },
        { id: 3, name: 'Charlie', division: 'MergerX', email: 'sample3@mail.com' },
    ];

    return (
        <div className="h-screen flex flex-col bg-white">
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
                            {/* サイドバーのリンクなどを追加する場所 */}
                        </nav>
                    </div>
                </aside>

                {/* メインコンテンツ */}
                <main className="flex-1 flex flex-col p-8">
                    <div className="flex justify-start mb-4">
                        <h1 className="text-2xl font-bold text-blue-500">管理画面</h1>
                    </div>
                    <div className="flex flex-col justify-start mt-4">
                        <div>
                            <h1 className="text-xl font-bold text-blue-500 mb-4">
                                管理ユーザ
                            </h1>
                        </div>
                        <div>
                            <table className="table-auto w-full border-collapse">
                                <thead className="bg-blue-500 text-white">
                                    <tr>
                                        <th className="border border-gray-300 p-2">ID</th>
                                        <th className="border border-gray-300 p-2">名前</th>
                                        <th className="border border-gray-300 p-2">事業部</th>
                                        <th className="border border-gray-300 p-2">メールアドレス</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-white">
                                        <td className="border border-gray-300 p-2">1</td>
                                        <td className="border border-gray-300 p-2">類似太郎</td>
                                        <td className="border border-gray-300 p-2">ヘンテコ事業部</td>
                                        <td className="border border-gray-300 p-2">ponpoko@mail.com</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between items-center mb-4 mt-8">
                            <div>
                                <h1 className="text-xl font-bold text-blue-500 mb-4">
                                    承認ユーザ
                                </h1>
                            </div>
                            <button className="bg-green-500 font-bold text-white p-2 rounded-md w-36 mb-4 hover:bg-green-600">
                                ユーザ登録
                            </button>
                        </div>

                        <div>
                            <table className="table-auto w-full border-collapse border border-gray-300">
                                <thead className="bg-blue-500 text-white">
                                    <tr>
                                        <th className="border border-gray-300 p-2">ID</th>
                                        <th className="border border-gray-300 p-2">名前</th>
                                        <th className="border border-gray-300 p-2">事業部</th>
                                        <th className="border border-gray-300 p-2">メールアドレス</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((row) => (
                                        <tr key={row.id} className="bg-white">
                                            <td className="border border-gray-300 p-2">{row.id}</td>
                                            <td className="border border-gray-300 p-2">{row.name}</td>
                                            <td className="border border-gray-300 p-2">{row.division}</td>
                                            <td className="border border-gray-300 p-2">{row.email}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
