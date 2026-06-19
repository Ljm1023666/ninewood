'use client';
import React from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-media-query';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';

const ModalContext = React.createContext<{ isMobile: boolean } | null>(null);
function useContext() {
  const context = React.useContext(ModalContext);
  if (!context) throw new Error('Trigger or Content must be used within <Modal>');
  return context;
}

type ModalProps = { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode };
const Modal = ({ open, onOpenChange, children }: ModalProps) => {
  const isMobile = useIsMobile();
  const Component = isMobile ? Drawer : Dialog;
  return <ModalContext.Provider value={{ isMobile }}><Component open={open} onOpenChange={onOpenChange}>{children}</Component></ModalContext.Provider>;
};

type ModalTriggerProps = { className?: string; children: React.ReactNode; asChild?: boolean };
const ModalTrigger = ({ className, children, asChild }: ModalTriggerProps) => {
  const { isMobile } = useContext();
  const Component = isMobile ? DrawerTrigger : DialogTrigger;
  return <Component className={className} asChild={asChild}>{children}</Component>;
};

type ModalContentProps = { children: React.ReactNode; className?: string };
const ModalContent = ({ className, children }: ModalContentProps) => {
  const { isMobile } = useContext();
  const Component = isMobile ? DrawerContent : DialogContent;
  return <Component className={className}>{children}</Component>;
};

const ModalTitle = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  const { isMobile } = useContext();
  const Component = isMobile ? DrawerTitle : DialogTitle;
  return <Component className={className}>{children}</Component>;
};

export { Modal, ModalTrigger, ModalContent, ModalTitle };
