import { Home, Search, Shield, Zap, Users, MessageCircle } from "lucide-react";
import { Button } from "./ui/button";
import { useTranslation } from "../utils/i18n";

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  const { t } = useTranslation();
  const features = [
    {
      icon: Search,
      title: "Easy Search",
      description: "Find apartments with powerful filters and real-time results",
    },
    {
      icon: Shield,
      title: "Direct Contact",
      description: "Connect directly with landlords via WhatsApp - no middlemen",
    },
    {
      icon: Zap,
      title: "Fast & Simple",
      description: "Streamlined process to get you into your new home quickly",
    },
    {
      icon: Users,
      title: "For Everyone",
      description: "Perfect for tenants searching and landlords listing properties",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-600 via-cyan-700 to-teal-700 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Side - Hero Content */}
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center space-x-4 animate-in zoom-in duration-700">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl">
                <Home className="w-10 h-10 md:w-12 md:h-12 text-cyan-600" strokeWidth={2} />
              </div>
              <h1 className="text-white text-5xl md:text-6xl lg:text-7xl">HomeLink</h1>
            </div>
            
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 anim-delay-200">
              <h2 className="text-white/90 text-2xl md:text-3xl lg:text-4xl">
                Find your perfect home, without the hassle
              </h2>
              <p className="text-cyan-50 text-opacity-80 text-lg md:text-xl max-w-2xl mx-auto lg:mx-0">
                Connect directly with landlords. No agents, no commissions, no stress. 
                Just simple, transparent apartment searching.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-in fade-in slide-in-from-bottom-4 duration-700 anim-delay-400">
              <Button
                onClick={onGetStarted}
                className="bg-white text-cyan-700 hover:bg-cyan-50 rounded-2xl h-14 md:h-16 px-8 md:px-12 shadow-2xl text-lg hover:scale-105 transition-transform"
              >
                {t("getStarted")}
              </Button>
              <Button
                variant="outline"
                className="bg-transparent border-2 border-white text-white hover:bg-white/10 rounded-2xl h-14 md:h-16 px-8 md:px-12 text-lg"
                onClick={onGetStarted}
              >
                Learn More
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 anim-delay-600">
              <div className="text-center lg:text-left">
                <div className="text-3xl md:text-4xl text-white">500+</div>
                <div className="text-sm text-cyan-100">Apartments</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-3xl md:text-4xl text-white">1000+</div>
                <div className="text-sm text-cyan-100">Happy Tenants</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-3xl md:text-4xl text-white">200+</div>
                <div className="text-sm text-cyan-100">Landlords</div>
              </div>
            </div>
          </div>

          {/* Right Side - Features */}
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-700 anim-delay-300">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all hover:scale-105"
                  // per-item stagger handled by parent if needed
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-cyan-600" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-white">{feature.title}</h3>
                      <p className="text-cyan-50 text-opacity-80 text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Text */}
        <div className="text-center mt-16 animate-in fade-in duration-700" style={{ animationDelay: "800ms", animationFillMode: "backwards" }}>
          <p className="text-cyan-100 text-sm">
            Trusted by thousands of renters and landlords across the city
          </p>
        </div>
      </div>
    </div>
  );
}
