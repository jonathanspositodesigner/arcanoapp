 import React from 'react';
 import { AlertTriangle } from 'lucide-react';
 import {
   AlertDialog,
   AlertDialogContent,
   AlertDialogHeader,
   AlertDialogTitle,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogAction,
 } from '@/components/ui/alert-dialog';
 
 interface ActiveJobBlockModalProps {
   isOpen: boolean;
   onClose: () => void;
   activeTool: string;
 }
 
 const ActiveJobBlockModal: React.FC<ActiveJobBlockModalProps> = ({
   isOpen,
   onClose,
   activeTool,
 }) => {
   return (
     <AlertDialog open={isOpen} onOpenChange={onClose}>
       <AlertDialogContent className="bg-[#1A0A2E] border-purple-500/30">
         <AlertDialogHeader>
           <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-yellow-500/20 rounded-full">
               <AlertTriangle className="w-6 h-6 text-yellow-400" />
             </div>
             <AlertDialogTitle className="text-white text-lg">
               Trabalho em Andamento
             </AlertDialogTitle>
           </div>
           <AlertDialogDescription className="text-purple-200/70">
             Você já tem um trabalho em processamento no <strong className="text-purple-300">{activeTool}</strong>.
             <br /><br />
             Aguarde a conclusão do trabalho atual antes de iniciar outro.
           </AlertDialogDescription>
         </AlertDialogHeader>
         <AlertDialogFooter>
           <AlertDialogAction
             onClick={onClose}
             className="bg-purple-600 hover:bg-purple-700 text-white"
           >
             Entendi
           </AlertDialogAction>
         </AlertDialogFooter>
       </AlertDialogContent>
     </AlertDialog>
   );
 };
 
 export default ActiveJobBlockModal;