import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onSubmit?: () => void;
  submitLabel?: string;
  loading?: boolean;
}

const AdminModal = ({ open, onClose, title, children, onSubmit, submitLabel = "Save", loading }: AdminModalProps) => (
  <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">{children}</div>
      {onSubmit && (
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={onSubmit} disabled={loading}>
            {loading ? "Saving…" : submitLabel}
          </Button>
        </DialogFooter>
      )}
    </DialogContent>
  </Dialog>
);

export default AdminModal;
