import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, TrendingUp, Map, Leaf, ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import landproLogo from "@/assets/landpro-logo.png";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={landproLogo} alt="LandPro AI" className="h-12 w-auto" />
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#solutions" className="text-muted-foreground hover:text-foreground transition-colors">
              Solutions
            </a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
            <Button 
              onClick={() => navigate("/dashboard/map")}
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(140_60%_45%/0.1),transparent_50%)]" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground via-primary to-foreground">
              Understand Your Land in Under 2 Minutes
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Whether you're clearing brush, planning a build, or pricing a job — draw a boundary and get instant AI analysis with equipment needs, cost estimates, and clear next steps.
            </p>
            <p className="text-lg text-muted-foreground/80 mb-12">
              Built for landowners, contractors, and farmers who need answers fast.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => navigate("/dashboard/map")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 shadow-[0_0_30px_hsl(140_60%_45%/0.3)] hover:shadow-[0_0_50px_hsl(140_60%_45%/0.5)] transition-all"
              >
                Analyze Your Land Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => {
                  const el = document.getElementById('about');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="border-border text-foreground text-lg px-8 py-6 hover:bg-muted"
              >
                See How It Works
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="animate-fade-in">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                From Confusion to Clarity — Instantly
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Draw a boundary, get answers. LandPro AI analyzes any parcel and delivers clear, actionable 
                insights: vegetation density, terrain conditions, equipment needs, cost estimates, and next steps. 
                No guesswork. No delays. Just the information you need to move forward.
              </p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-lg blur-3xl" />
              <div className="relative bg-card border border-border rounded-lg p-8 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary mb-2">&lt;2min</div>
                    <div className="text-sm text-muted-foreground">Time to Insights</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary mb-2">1-Click</div>
                    <div className="text-sm text-muted-foreground">Analysis Start</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary mb-2">100%</div>
                    <div className="text-sm text-muted-foreground">Actionable Output</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                    <div className="text-sm text-muted-foreground">AI Availability</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="solutions" className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to Take Action
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From analysis to execution — all in one platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            <Card className="bg-card border-border hover:border-primary/50 transition-all group">
              <CardHeader>
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Map className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-xl">Draw & Analyze</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Draw a boundary on any parcel and get instant AI-powered analysis of terrain, vegetation, and conditions
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:border-primary/50 transition-all group">
              <CardHeader>
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Brain className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-xl">Smart Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Get clear next steps: equipment needs, labor estimates, cost breakdowns, and hazard warnings
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:border-primary/50 transition-all group">
              <CardHeader>
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <TrendingUp className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-xl">Instant Quotes</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Generate professional quotes in seconds with AI-calculated labor, materials, and equipment costs
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:border-primary/50 transition-all group">
              <CardHeader>
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Leaf className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-xl">Project Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Save analyses as projects, track jobs, manage clients, and keep everything organized in one place
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-gradient-to-b from-background to-muted/30 border-y border-primary/20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
              Why Landowners Choose LandPro AI
            </h2>
            
            <div className="space-y-8">
              <div className="flex items-start gap-4 group">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Stop guessing, start knowing</h3>
                  <p className="text-muted-foreground text-lg">
                    Get accurate land assessments backed by AI analysis — vegetation, terrain, hazards, and costs in one view
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Know your next step immediately</h3>
                  <p className="text-muted-foreground text-lg">
                    Every analysis includes clear recommendations: what equipment you need, how long it'll take, and what it'll cost
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Move from idea to action in minutes</h3>
                  <p className="text-muted-foreground text-lg">
                    Whether you're clearing, developing, or maintaining — get the insights you need to start today, not next week
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to see what your land can do?
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              Landowners, contractors, and farmers are already saving hours on every job. Start your first analysis free.
            </p>
            <Button 
              size="lg"
              onClick={() => navigate("/dashboard/map")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-10 py-6 shadow-[0_0_30px_hsl(140_60%_45%/0.3)] hover:shadow-[0_0_50px_hsl(140_60%_45%/0.5)] transition-all"
            >
              Start Your Free Analysis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-12 bg-muted/30 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img src={landproLogo} alt="LandPro AI" className="h-10 w-auto" />
            </div>
            
            <div className="flex items-center gap-6">
              <a href="mailto:contact@landproai.com" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <Mail className="w-5 h-5" />
                <span>contact@landproai.com</span>
              </a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>&copy; 2025 LandPro AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
