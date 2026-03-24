import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { Zap, ArrowRight, GitBranch, Webhook, Send, Shield, LogIn } from "lucide-react";
import { API_BASE_URL } from "@/config/apiconfig";

const features = [
  { icon: Send, title: "Postman-first", desc: "Select workspace, collection, and endpoints — AI builds your testsuite" },
  { icon: Webhook, title: "Monitoring", desc: "Runs are recorded in Supabase for your team" },
  { icon: GitBranch, title: "Jira (deprecated)", desc: "Legacy flow: issues to tests — still available from the dashboard" },
  { icon: Shield, title: "Export", desc: "Download a standard testsuite Excel file when you're done" },
];

const Landing = () => {
  const navigate = useNavigate();
  const { isJiraAuthenticated, isPostmanAuthenticated } = useAuth();

  const handleJiraConnect = () => {
    window.location.href = `${API_BASE_URL}/jira/login`;
  };


const handleGetStarted = () => {
  navigate("/dashboard/postman");
};

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between px-6 lg:px-12 py-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">TestGenAI</span>
          </div>
          
          <div className="flex items-center gap-3">
            {isJiraAuthenticated && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span className="text-xs font-medium text-primary">Jira Connected</span>
              </div>
            )}
            {isPostmanAuthenticated && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-xs font-medium text-orange-500">Postman Connected</span>
              </div>
            )}
            
            <button
              onClick={handleGetStarted}
              className="px-4 py-2 text-sm font-medium rounded-lg gradient-bg text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Open app
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-20 lg:pt-32 pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              AI-Powered API Test Generation
            </div>

            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
              From{" "}
              <span className="gradient-text">Postman APIs </span>
              to Test Suites in Minutes
            </h1>

            <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Paste your Postman API key, pick requests from any workspace and collection,
              generate structured test cases, save them for monitoring, and export Excel.
            </p>

            {/* Connection Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <button
                onClick={handleGetStarted}
                className="group px-8 py-3.5 rounded-xl font-semibold text-base transition-all flex items-center gap-2 gradient-bg text-primary-foreground hover:opacity-90 glow-shadow"
              >
                <Send className="w-4 h-4" />
                Start with Postman
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={handleJiraConnect}
                disabled={isJiraAuthenticated}
                className={`group px-8 py-3.5 rounded-xl font-semibold text-base transition-all flex items-center gap-2 border border-border ${
                  isJiraAuthenticated
                    ? "opacity-60 cursor-default"
                    : "hover:bg-muted"
                }`}
              >
                <LogIn className="w-4 h-4" />
                {isJiraAuthenticated ? "Jira connected" : "Jira (deprecated)"}
              </button>
            </div>

            {/* Demo Button */}
            <div className="flex justify-center">
              <button className="px-6 py-2.5 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-muted transition-colors">
                Watch Demo
              </button>
            </div>

            {/* Status Message */}
            {isJiraAuthenticated && isPostmanAuthenticated && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20"
              >
                <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                <span className="text-sm font-medium text-success">All services connected! You're ready to go.</span>
              </motion.div>
            )}
          </motion.div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-6 pb-32">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                className="glass-card p-6 hover-lift cursor-default"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Landing;
