"use client";

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AuthPage from "./auth/page";
import HomePage from "./home/page";
import GroupSelect from "./group/select/page";
import GroupRun from "./group/run/page";
import GroupEdit from "./group/edit/page";
import GroupDetail from "./group/detail/page";

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<AuthPage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/group/select" element={<GroupSelect />} />
                <Route path="/run" element={<GroupRun />} />
                <Route path="/edit" element={<GroupEdit />} />
                <Route path="/group/detail" element={<GroupDetail />} />
            </Routes>
        </Router>
    );
}
