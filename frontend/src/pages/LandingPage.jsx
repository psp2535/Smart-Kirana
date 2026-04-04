import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  TrendingUp, 
  MessageSquare, 
  Scan, 
  BarChart3, 
  Globe, 
  ShoppingCart,
  Zap,
  Shield,
  Clock,
  ArrowRight
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Scan className="w-8 h-8" />,
      title: "AI Bill Scanner",
      description: "Scan wholesale bills and let AI extract all items automatically. Save 15 minutes per bill.",
      gradient: "from-neutral-700 to-neutral-900"
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "Voice Assistant",
      description: "Manage your business with voice commands in 5 languages. Just speak naturally!",
      gradient: "from-black to-neutral-800"
    },
    {
      icon: <ShoppingCart className="w-8 h-8" />,
      title: "Customer Shopping AI",
      description: "AI suggests ingredients for recipes. Customers can order 24/7 even when shop is closed.",
      gradient: "from-neutral-800 to-black"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Smart Analytics",
      description: "Real-time profit tracking, sales trends, and business insights powered by AI.",
      gradient: "from-neutral-600 to-neutral-900"
    }
  ];

  const benefits = [
    { icon: <Zap className="w-6 h-6" />, text: "Save 3-4 hours daily" },
    { icon: <Globe className="w-6 h-6" />, text: "5 Indian languages" },
    { icon: <Shield className="w-6 h-6" />, text: "100% Free Forever" },
    { icon: <Clock className="w-6 h-6" />, text: "Start in 5 minutes" }
  ];

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 bg-secondary-50 dark:bg-secondary-900">
        <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-neutral-400/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-neutral-600/10 blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="bg-white/70 dark:bg-secondary-900/70 backdrop-blur-xl border-b border-secondary-200/50 dark:border-secondary-800/50 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-neutral-800 to-black rounded-xl flex items-center justify-center shadow-lg shadow-neutral-900/30">
                <Sparkles className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-neutral-800 to-black dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">
                Smart Kirana
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/login')}
                className="px-5 py-2.5 text-secondary-700 dark:text-secondary-200 hover:text-black dark:hover:text-white font-semibold transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-6 py-2.5 bg-gradient-to-r from-neutral-800 to-black text-white rounded-xl hover:from-black hover:to-neutral-900 font-semibold shadow-lg shadow-neutral-900/30 transition-all transform hover:-translate-y-0.5"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 relative">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-white/80 dark:bg-secondary-800/80 backdrop-blur-sm border border-secondary-200 dark:border-secondary-700 px-5 py-2 rounded-full shadow-sm mb-8 animate-fadeIn">
            <span className="flex h-2 w-2 rounded-full bg-black dark:bg-white animate-pulse"></span>
            <span className="text-sm font-semibold text-secondary-800 dark:text-secondary-200">AI-Powered Business Management</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-secondary-900 dark:text-white mb-8 leading-tight tracking-tight animate-slideInLeft">
            Manage Your Shop with{' '}
            <span className="block mt-2 bg-gradient-to-r from-neutral-800 via-neutral-500 to-black dark:from-white dark:via-neutral-400 dark:to-neutral-200 bg-clip-text text-transparent">
              AI & Voice Commands
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl sm:text-2xl text-secondary-600 dark:text-secondary-300 mb-12 max-w-3xl mx-auto font-medium">
            Save up to 90% of your time on inventory, sales, and customer management. 
            <span className="font-bold text-black dark:text-white"> 100% Free Forever.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16">
            <button
              onClick={() => navigate('/register')}
              className="group w-full sm:w-auto flex items-center justify-center px-8 py-4 bg-gradient-to-r from-neutral-800 to-black text-white text-lg font-bold rounded-2xl hover:from-black hover:to-neutral-900 shadow-xl shadow-black/25 transition-all transform hover:-translate-y-1"
            >
              Start Free Now
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-4 bg-white/50 dark:bg-secondary-800/50 backdrop-blur-md text-secondary-800 dark:text-white text-lg font-bold rounded-2xl border-2 border-secondary-200 dark:border-secondary-700 hover:border-black hover:text-black dark:hover:border-white dark:hover:text-white transition-all transform hover:-translate-y-1 shadow-sm"
            >
              Learn More
            </button>
          </div>

          {/* Benefits */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-secondary-700 dark:text-secondary-300 font-medium">
            {benefits.map((benefit, index) => (
               <div key={index} className="flex items-center space-x-2 bg-white/40 dark:bg-secondary-800/40 backdrop-blur-sm px-4 py-2 rounded-lg border border-secondary-200/50 dark:border-secondary-700/50">
                 <div className="text-black dark:text-white">
                   {benefit.icon}
                 </div>
                 <span>{benefit.text}</span>
               </div>
            ))}
          </div>
        </div>

        {/* Hero Feature Cards */}
        <div className="mt-20 relative mx-auto max-w-5xl">
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-500/10 to-black/10 blur-[100px] -z-10"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/80 dark:bg-secondary-800/80 backdrop-blur-xl p-8 rounded-3xl border border-secondary-200/50 dark:border-secondary-700/50 shadow-xl shadow-secondary-200/20 dark:shadow-none transform transition-all hover:-translate-y-2 hover:shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-6 border border-neutral-200 dark:border-neutral-700">
                <TrendingUp className="w-8 h-8 text-black dark:text-white" />
              </div>
              <h3 className="text-xl font-bold text-secondary-900 dark:text-white mb-3">Revenue Up 25%</h3>
              <p className="text-secondary-600 dark:text-secondary-300 leading-relaxed">Better inventory management increases profits instantly.</p>
            </div>
            <div className="bg-white/80 dark:bg-secondary-800/80 backdrop-blur-xl p-8 rounded-3xl border border-secondary-200/50 dark:border-secondary-700/50 shadow-xl shadow-secondary-200/20 dark:shadow-none transform transition-all hover:-translate-y-2 hover:shadow-2xl md:-translate-y-4">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-6 border border-neutral-200 dark:border-neutral-700">
                <Clock className="w-8 h-8 text-black dark:text-white" />
              </div>
              <h3 className="text-xl font-bold text-secondary-900 dark:text-white mb-3">Save 3 Hours Daily</h3>
              <p className="text-secondary-600 dark:text-secondary-300 leading-relaxed">Automate repetitive tasks with advanced AI capabilities.</p>
            </div>
            <div className="bg-white/80 dark:bg-secondary-800/80 backdrop-blur-xl p-8 rounded-3xl border border-secondary-200/50 dark:border-secondary-700/50 shadow-xl shadow-secondary-200/20 dark:shadow-none transform transition-all hover:-translate-y-2 hover:shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-6 border border-neutral-200 dark:border-neutral-700">
                <MessageSquare className="w-8 h-8 text-black dark:text-white" />
              </div>
              <h3 className="text-xl font-bold text-secondary-900 dark:text-white mb-3">Voice Control</h3>
              <p className="text-secondary-600 dark:text-secondary-300 leading-relaxed">Manage your entire business naturally using just your voice.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-secondary-900 dark:text-white mb-6">
            Powerful AI Features
          </h2>
          <p className="text-xl text-secondary-600 dark:text-secondary-300 max-w-2xl mx-auto font-medium">
            Everything you need to orchestrate your retail business efficiently and scale rapidly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-white/80 dark:bg-secondary-800/80 backdrop-blur-md rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-300 border border-secondary-200/50 hover:border-black/30 dark:border-secondary-700 hover:-translate-y-2"
            >
              <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${feature.gradient} text-white mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold text-secondary-900 dark:text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-secondary-600 dark:text-secondary-300 leading-relaxed text-lg">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Premium CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="relative overflow-hidden bg-black rounded-[3rem] p-12 sm:p-20 text-center shadow-2xl border border-neutral-800">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neutral-600/20 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-neutral-800/30 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2"></div>
          
          <div className="relative z-10">
            <h2 className="text-4xl sm:text-6xl font-extrabold text-white mb-6 tracking-tight">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl text-neutral-300 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
              Join thousands of forward-thinking retailers who are saving time and increasing profits with Smart Kirana.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button
                onClick={() => navigate('/register')}
                className="w-full sm:w-auto px-10 py-5 bg-white text-black text-lg font-bold rounded-2xl hover:bg-neutral-200 shadow-xl transition-all transform hover:-translate-y-1"
              >
                Get Started Free
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-10 py-5 bg-transparent text-white text-lg font-bold rounded-2xl border-2 border-white/20 hover:bg-white/10 transition-all transform hover:-translate-y-1 backdrop-blur-sm"
              >
                Sign In to Account
              </button>
            </div>
            <p className="text-neutral-400 mt-8 text-sm font-medium">
              No credit card required • Free forever • Instant setup
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white/80 dark:bg-secondary-900/80 backdrop-blur-md border-t border-secondary-200 dark:border-secondary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left">
            <div className="mb-6 md:mb-0 space-y-4">
               <div className="flex items-center justify-center md:justify-start space-x-2">
                 <div className="w-8 h-8 bg-gradient-to-br from-neutral-800 to-black rounded-lg flex items-center justify-center shadow-lg border border-neutral-700">
                   <Sparkles className="text-white w-5 h-5" />
                 </div>
                 <span className="text-2xl font-bold text-secondary-900 dark:text-white">Smart Kirana</span>
               </div>
               <p className="text-secondary-500 max-w-xs">Premium AI-powered business management platform for modern retailers.</p>
            </div>
            <div className="text-secondary-500 text-sm font-medium">
              © {new Date().getFullYear()} Smart Kirana. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
