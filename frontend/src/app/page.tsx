"use client";

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AuthPage from "./auth/page";
import HomePage from "./home/page";
import GroupSelect from "./group/select/page";
import GroupRun from "./group/run/page";
import GroupEdit from "./group/edit/page";
import GroupDetail from "./group/detail/page";
import SearchSelect from "./search/select/page";
import SearchRun from "./search/run/page";
import SignIn from "./signIn/page";
import Admin from "./admin/page";
import ProcessingGroups from "./group/processing/page";

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<AuthPage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/group/select" element={<GroupSelect />} />
                <Route path="/group/run" element={<GroupRun />} />
                <Route path="/group/edit" element={<GroupEdit />} />
                <Route path="/group/detail" element={<GroupDetail />} />
                <Route path="/search/select" element={<SearchSelect />} />
                <Route path="/search/run" element={<SearchRun />} />
                <Route path="/signIn" element={<SignIn />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/group/processing" element={<ProcessingGroups />} />
            </Routes>
        </Router>
    );
}
