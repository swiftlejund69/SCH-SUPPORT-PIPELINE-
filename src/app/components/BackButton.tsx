import type { ReactNode } from "react";

type BackButtonProps = {
  children: ReactNode;
  onClick: () => void;
};

export function BackButton({ children, onClick }: BackButtonProps) {
  return (
    <button className="back-button" onClick={onClick} type="button">
      {children}
    </button>
  );
}
