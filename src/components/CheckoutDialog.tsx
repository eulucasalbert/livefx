import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface PayerInfo {
  firstName: string;
  lastName: string;
}

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payer: PayerInfo) => void;
  loading: boolean;
  productName: string;
}

const CheckoutDialog = ({
  open,
  onClose,
  onConfirm,
  loading,
  productName,
}: CheckoutDialogProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = "Informe seu nome";
    if (!lastName.trim()) errs.lastName = "Informe seu sobrenome";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onConfirm({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Dados para pagamento</DialogTitle>
          <DialogDescription>
            Preencha seus dados para comprar <strong>{productName}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Nome</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="João"
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Sobrenome</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Silva"
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? "Processando..." : "Continuar para pagamento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutDialog;
