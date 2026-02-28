import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Mail, Lock, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const isWebView = () => {
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|WhatsApp|Snapchat|Line|Twitter|MicroMessenger|wv|WebView/i.test(ua);
};

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const inWebView = isWebView();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const recoverOAuthSession = async () => {
      try {
        // Implicit flow callback (#access_token=...)
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");

        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }

        // PKCE callback (?code=...)
        if (new URL(window.location.href).searchParams.get("code")) {
          await supabase.auth.exchangeCodeForSession(window.location.href);
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("code");
          window.history.replaceState({}, document.title, `${cleanUrl.pathname}${cleanUrl.search}`);
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && session) window.location.replace("/");
      } catch (error) {
        console.error("OAuth recovery error:", error);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) window.location.replace("/");
    });

    recoverOAuthSession();

    const interval = window.setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) window.location.replace("/");
    }, 1500);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada para redefinir a senha." });
        setMode("login");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: "Conta criada!", description: "Verifique seu email para confirmar o cadastro." });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setSocialLoading(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result?.error) throw result.error;

      if (!(result as { redirected?: boolean }).redirected) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          window.location.replace("/");
        } else {
          toast({ title: "Login concluído", description: "Finalizando sessão, aguarde 1-2 segundos..." });
        }
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSocialLoading(null);
    }
  };

  const titles = {
    login: "Entrar na sua conta",
    signup: "Criar conta grátis",
    forgot: "Recuperar senha",
  };

  const descriptions = {
    login: "Acesse seus efeitos e downloads exclusivos.",
    signup: "Cadastre-se para comprar e baixar efeitos.",
    forgot: "Digite seu email para receber o link de recuperação.",
  };

  return (
    <div className="min-h-screen bg-[#0F0F12] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center">
          <Sparkles className="w-6 h-6 text-primary neon-text-pink" />
          <h1 className="font-display font-black text-xl text-foreground">
            LIVE<span className="neon-gradient-text-pink-cyan">FX</span>
          </h1>
        </div>

        <div className="glass-card-strong border border-border/30 rounded-2xl p-6 space-y-5">
          {/* Back button for forgot mode */}
          {mode === "forgot" && (
            <button
              onClick={() => setMode("login")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao login
            </button>
          )}

          {/* Title */}
          <div className="text-center space-y-1.5">
            <h2 className="font-display font-bold text-lg text-foreground">{titles[mode]}</h2>
            <p className="text-sm text-muted-foreground">{descriptions[mode]}</p>
          </div>

          {/* WebView warning */}
          {inWebView && mode !== "forgot" && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm text-yellow-200 space-y-2">
              <p className="font-bold">⚠️ Navegador limitado</p>
              <p>Para login social, abra no Chrome/Safari. Toque em ⋮ → "Abrir no navegador".</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast({ title: "Link copiado!" });
                }}
              >
                📋 Copiar link
              </Button>
            </div>
          )}

          {/* Social buttons */}
          {mode !== "forgot" && !inWebView && (
            <div className="space-y-2.5">
              {/* Google */}
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuth("google")}
                disabled={!!socialLoading}
                className="w-full font-display font-semibold tracking-wide border-border/40 hover:border-primary/40 transition-all h-11"
              >
                <svg className="w-4 h-4 mr-2.5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {socialLoading === "google" ? "Conectando..." : "Continuar com Google"}
              </Button>

              {/* Apple */}
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuth("apple")}
                disabled={!!socialLoading}
                className="w-full font-display font-semibold tracking-wide border-border/40 hover:border-foreground/40 transition-all h-11"
              >
                <svg className="w-4 h-4 mr-2.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.62-2.2.44-3.06-.4C4.24 16.67 4.89 10.42 8.8 10.18c1.27.07 2.15.72 2.9.75.96-.18 1.88-.88 3.18-.75 1.36.14 2.38.81 3.05 2.04-2.79 1.65-2.13 5.27.52 6.29-.61 1.64-1.4 3.27-2.75 4.6-.76.76-1.62.24-2.65-.2-1.07-.44-2.06-.47-3.19 0-1.32.54-2.03.39-2.81-.37C3.37 18.86 2.95 12.45 6.8 9.8c1.54-1.05 3.42-.87 4.7.04 1.26-.92 2.72-1.13 4.25-.5 1.85.77 3.05 2.18 3.4 4.27-2.58.63-3.6 3.41-2.1 6.67z" />
                </svg>
                {socialLoading === "apple" ? "Conectando..." : "Continuar com Apple"}
              </Button>
            </div>
          )}

          {/* Divider */}
          {mode !== "forgot" && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border/40" />
              <span className="text-xs text-muted-foreground font-body">ou</span>
              <div className="flex-1 h-px bg-border/40" />
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 bg-muted/30 border-border/40 text-foreground h-11"
              />
            </div>
            {mode !== "forgot" && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Sua senha (mínimo 6 caracteres)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10 bg-muted/30 border-border/40 text-foreground h-11"
                />
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full font-display font-bold uppercase tracking-wider neon-glow-pink h-11"
            >
              {loading
                ? "..."
                : mode === "login"
                  ? "Entrar"
                  : mode === "signup"
                    ? "Criar Conta"
                    : "Enviar email"}
            </Button>
          </form>

          {/* Forgot password link */}
          {mode === "login" && (
            <button
              onClick={() => setMode("forgot")}
              className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Esqueceu a senha?
            </button>
          )}

          {/* Toggle login/signup */}
          {mode !== "forgot" && (
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {mode === "login" ? "Não tem conta? Criar conta grátis" : "Já tem conta? Fazer login"}
            </button>
          )}
        </div>

        {/* Back to home */}
        <button
          onClick={() => navigate("/")}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Voltar ao site
        </button>
      </div>
    </div>
  );
};

export default Auth;
