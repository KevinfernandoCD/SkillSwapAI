import React, { useState } from 'react';
import { X, ArrowRightLeft, Send, User, ChevronDown, Loader2 } from 'lucide-react';
import { Session, Skill } from '../../types';
import { useCreateExchangeRequest } from "@/hooks/useCreateExchangeRequest";
import { useGetUserSkills } from "@/hooks/useGetUserSkills";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '../ui/alert-dialog';

interface SkillSwapModalProps {
  session: Session | null;
  isOpen: boolean;
  onClose: () => void;
}

const SkillSwapModal: React.FC<SkillSwapModalProps> = ({ 
  session, 
  isOpen, 
  onClose
}) => {
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [message, setMessage] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<null | React.FormEvent>(null);
  const { toast } = useToast();

  // Fetch user skills from API
  const { data: userSkillsResponse, isLoading: isLoadingSkills, error: skillsError } = useGetUserSkills();
  const userSkills: Skill[] = userSkillsResponse?.data || [];

  // Filter user's teaching skills - show all teaching skills regardless of proficiency
  const availableSkills = userSkills.filter(skill => 
    skill.type === 'teaching'
  );

  const selectedSkill = availableSkills.find(skill => skill._id === selectedSkillId);

  // Create exchange request hook
  const { mutate: createExchangeRequest, status: createStatus } = useCreateExchangeRequest({
    onSuccess: () => {
      toast({
        title: "Swap Request Sent",
        description: "Your skill swap request has been sent successfully!"
      });
      setSelectedSkillId('');
      setMessage('');
      setMeetingLink('');
      setConfirmDialogOpen(false);
      setPendingSubmit(null);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Swap Request Failed",
        description: error?.response?.data?.message || "Could not send swap request.",
        variant: "destructive",
      });
    },
  });

  if (!isOpen || !session) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkillId) return;
    setPendingSubmit(e);
    setConfirmDialogOpen(true);
  };
    
  const handleConfirmSwap = () => {
    if (!selectedSkillId || !session) return;
    
    // Get the session skill ID from the teachSkillId array
    const sessionSkillId = session.teachSkillId && session.teachSkillId.length > 0 
      ? session.teachSkillId[0]._id 
      : null;
    
    if (!sessionSkillId) {
      toast({
        title: "Error",
        description: "Session skill not found.",
        variant: "destructive",
      });
      return;
    }
    
    createExchangeRequest({
      sessionId: session._id,
      recipient: session.hostId._id,
      offeredSkillId: sessionSkillId,
      requestedSkillId: selectedSkillId,
      message
    });
  };

  const handleCancelSwap = () => {
    setConfirmDialogOpen(false);
    setPendingSubmit(null);
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'programming':
        return 'bg-blue-900 text-blue-300';
      case 'design':
        return 'bg-purple-900 text-purple-300';
      case 'management':
        return 'bg-green-900 text-green-300';
      case 'marketing':
        return 'bg-orange-900 text-orange-300';
      case 'data science':
        return 'bg-teal-900 text-teal-300';
      default:
        return 'bg-gray-800 text-gray-300';
    }
  };

  // Loading state for skills
  if (isLoadingSkills) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-gray-900 rounded-lg shadow-xl border border-gray-800">
            <div className="flex items-center justify-center p-12">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <span className="text-white">Loading your skills...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state for skills
  if (skillsError) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-gray-900 rounded-lg shadow-xl border border-gray-800">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white flex items-center">
                <ArrowRightLeft className="w-5 h-5 mr-2" />
                Request Skill Swap
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 text-center">
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
                <h3 className="text-lg font-medium text-white mb-2">Error Loading Skills</h3>
                <p className="text-gray-400 mb-4">
                  {skillsError?.response?.data?.message || "Could not load your skills. Please try again."}
                </p>
                <button
                  onClick={onClose}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-gray-900 rounded-lg shadow-xl border border-gray-800">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <h2 className="text-xl font-bold text-white flex items-center">
              <ArrowRightLeft className="w-5 h-5 mr-2" />
              Request Skill Swap
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Session Info */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-white font-medium text-[18px] mb-2">{session.title || 'Untitled Session'}</h3>
              <div className="flex items-center space-x-4 mb-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(session.skillCategory || '')}`}>
                  {session.skillCategory || 'General'}
                </span>
                <div className="flex items-center text-gray-400">
                  <User className="w-4 h-4 mr-1" />
                  <span className="text-sm">with {session.hostId?.name || 'Session Host'}</span>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                {session.date ? new Date(session.date).toLocaleDateString() : 'Date TBD'} at {session.startTime || 'TBD'} - {session.endTime || 'TBD'}
              </p>
              
              {/* Display session focus keywords if available */}
              {session.focusKeywords && session.focusKeywords.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="text-sm text-gray-300 font-medium mb-2">Session Focus Keywords</div>
                  <ul className="text-sm text-gray-400 space-y-1">
                    {session.focusKeywords.map((keyword, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-primary mr-2 mt-1">•</span>
                        <span>{keyword}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Session Host Details */}
              {session.hostId && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      <img 
                        src={session.hostId.avatar} 
                        alt={session.hostId.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to initial if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center" style={{ display: 'none' }}>
                        <span className="text-white text-sm font-semibold">
                          {session.hostId.name?.charAt(0) || 'H'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{session.hostId.name}</p>
                      {session.hostId.email && (
                        <p className="text-xs text-gray-400">{session.hostId.email}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Skill Selection */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Select a skill you can offer in exchange:
                </label>
                
                {availableSkills.length > 0 ? (
                  <div className="relative">
                    {/* Dropdown Button */}
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg text-left hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-center">
                        {selectedSkill ? (
                          <>
                            <span className="text-white font-medium">{selectedSkill.name}</span>
                            <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(selectedSkill.category)}`}>
                              {selectedSkill.category}
                            </span>
                            <span className="ml-2 text-sm text-primary">{selectedSkill.proficiency}%</span>
                          </>
                        ) : (
                          <span className="text-gray-400">Select a skill to offer...</span>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Options */}
                    {isDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {availableSkills.map((skill) => (
                          <button
                            key={skill._id}
                            type="button"
                            onClick={() => {
                              setSelectedSkillId(skill._id);
                              setIsDropdownOpen(false);
                            }}
                            className="w-full flex flex-col items-start p-4 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                          >
                            <div className="flex items-center justify-between w-full mb-2">
                              <div className="flex items-center">
                                <span className="text-white font-medium">{skill.name}</span>
                                <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(skill.category)}`}>
                                  {skill.category}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-primary">{skill.proficiency}%</span>
                                <div className="w-16 bg-gray-600 rounded-full h-2">
                                  <div
                                    className="bg-primary h-2 rounded-full"
                                    style={{ width: `${skill.proficiency}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            
                            {/* Show agenda preview if available */}
                            {skill.agenda && skill.agenda.length > 0 && (
                              <div className="w-full">
                                <div className="text-xs text-gray-400 mb-1">Agenda preview:</div>
                                <div className="text-xs text-gray-300 line-clamp-2">
                                  {skill.agenda.slice(0, 2).join(', ')}
                                  {skill.agenda.length > 2 && ` +${skill.agenda.length - 2} more`}
                                </div>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-4">
                      You don't have any teaching skills available. Add some skills to your profile first.
                    </p>
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-primary hover:text-primary/80"
                    >
                      Add skills to your profile first
                    </button>
                  </div>
                )}
              </div>

              {/* Message */}
              {availableSkills.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Message (optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Introduce yourself and explain why you'd like to swap skills..."
                  />
                </div>
              )}

              {/* Meeting Link */}
              {availableSkills.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Meeting Link (optional)
                  </label>
                  <input
                    type="url"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="https://meet.google.com/xxx-xxxx-xxx or https://zoom.us/j/xxxxx"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Provide a meeting link for the exchange session (optional)
                  </p>
                </div>
              )}

              {/* Swap Preview */}
              {selectedSkill && (
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h4 className="text-white font-medium mb-4 text-center">Skill Swap Preview</h4>
                  <div className="flex items-center justify-center space-x-8">
                    <div className="text-center">
                      <div className="text-sm text-gray-400 mb-2">You Offer</div>
                      <div className="bg-primary/20 rounded-lg p-4 border border-primary/30">
                        <div className="text-white font-semibold text-sm">{selectedSkill.name}</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(selectedSkill.category)} mt-2`}>
                          {selectedSkill.category}
                        </div>
                        <div className="text-sm text-primary mt-1">{selectedSkill.proficiency}% proficiency</div>
                        
                        {/* Display agenda if available */}
                        {selectedSkill.agenda && selectedSkill.agenda.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-primary/30">
                            <div className="text-xs text-primary/80 mb-1">Agenda</div>
                            <ul className="text-xs text-primary/90 space-y-1">
                              {selectedSkill.agenda.map((item, idx) => (
                                <li key={idx} className="text-left">• {item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <ArrowRightLeft className="w-6 h-6 text-primary" />
                      <div className="text-xs text-gray-400 mt-1">Exchange</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm text-gray-400 mb-2">You Learn</div>
                      <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                        <div className="text-white font-semibold text-sm">
                          {session.teachSkillId && session.teachSkillId.length > 0 
                            ? session.teachSkillId[0].name 
                            : session.title}
                        </div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(session.skillCategory || '')} mt-2`}>
                          {session.skillCategory || 'General'}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">Session Skill</div>
                        
                        {/* Display session focus keywords if available */}
                        {session.focusKeywords && session.focusKeywords.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-gray-600">
                            <div className="text-xs text-gray-400 mb-1">Session Focus</div>
                            <ul className="text-xs text-gray-300 space-y-1">
                              {session.focusKeywords.map((item, idx) => (
                                <li key={idx} className="text-left">• {item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {session.hostId && (
                          <div className="mt-2 pt-2 border-t border-gray-600">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-5 h-5 rounded-full overflow-hidden">
                                <img 
                                  src={session.hostId.avatar} 
                                  alt={session.hostId.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback to initial if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center" style={{ display: 'none' }}>
                                  <span className="text-white text-xs font-semibold">
                                    {session.hostId.name?.charAt(0) || 'H'}
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs text-gray-300">
                                <div className="font-medium">{session.hostId.name}</div>
                                {session.hostId.email && (
                                  <div className="text-gray-400">{session.hostId.email}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              {availableSkills.length > 0 && (
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedSkillId || createStatus === 'pending'}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                    {createStatus === 'pending' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Swap Request
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Custom Confirmation Dialog for Swap Request */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Swap Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to send this skill swap request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSwap}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSwap}>Send Request</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SkillSwapModal;