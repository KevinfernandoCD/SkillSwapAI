import React, { useMemo, useState } from "react";
import { Calendar, Clock, ArrowRightLeft } from "lucide-react";
import { useGetExchangeSessions } from "@/hooks/useGetExchangeSessions";
import { ExchangeSession } from "@/hooks/useGetUpcomingExchangeSessions";
import UserProfile from "@/components/ui/UserProfile";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

const ExchangeSessionsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "completed" | "expired">("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, error, refetch } = useGetExchangeSessions();
  const sessions: ExchangeSession[] = data?.data || [];

  // Determine current user id for display purposes (to show "You")
  const currentUserId = (() => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return null;
      const u = JSON.parse(userStr);
      return u?._id || u?.id || null;
    } catch {
      return null;
    }
  })();

  const { toast } = useToast();
  const [completingSessions, setCompletingSessions] = useState<Set<string>>(new Set());
  const [confirmCompleteSession, setConfirmCompleteSession] = useState<string | null>(null);

  // Use a single completion handler that works with any session
  const handleComplete = async (sessionId: string) => {
    setCompletingSessions(prev => new Set(prev).add(sessionId));
    
    try {
      await api.patch(`/exchange-sessions/${sessionId}/complete`);
      toast({ title: 'Session completed' });
      refetch();
    } catch (error: any) {
      toast({ 
        title: 'Failed to complete', 
        description: error?.response?.data?.message || 'Network error', 
        variant: 'destructive' 
      });
    } finally {
      setCompletingSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  const handleCompleteClick = (sessionId: string) => {
    setConfirmCompleteSession(sessionId);
  };

  const handleConfirmComplete = () => {
    if (confirmCompleteSession) {
      handleComplete(confirmCompleteSession);
      setConfirmCompleteSession(null);
    }
  };

  const handleCancelComplete = () => {
    setConfirmCompleteSession(null);
  };

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesSearch =
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.skillCategory.toLowerCase().includes(search.toLowerCase()) ||
        s.skillId.name.toLowerCase().includes(search.toLowerCase()) ||
        s.requestedSkillId.name.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [sessions, statusFilter, search]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="bg-black min-h-screen">
      <div className="px-4 py-6 border-b border-gray-800 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl font-bold text-white">Exchange Sessions</h1>
            <p className="mt-1 text-sm text-gray-400">View and manage your skill exchange sessions</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 lg:px-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or skills..."
            className="flex-1 py-2 px-3 text-sm bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <select
            className="px-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading exchange sessions...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">
            <div className="mb-3">Failed to load exchange sessions.</div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No exchange sessions found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((session) => (
              <div key={session._id} className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300">
                        {session.skillCategory}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-900 text-indigo-300">
                        <ArrowRightLeft className="w-3 h-3 mr-1" /> Exchange
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300 capitalize">
                        {session.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium text-white">{session.title}</h3>
                  </div>
                </div>

                <div className="mt-2 mb-3 p-2 bg-gray-800 rounded-md">
                  <div className="text-xs text-gray-400 mb-1">Skill Exchange:</div>
                  <div className="flex items-center text-sm mb-2">
                    <span className="text-green-400">{session.skillId.name}</span>
                    <ArrowRightLeft className="w-3 h-3 mx-2 text-gray-500" />
                    <span className="text-orange-400">{session.requestedSkillId.name}</span>
                  </div>
                  
                  {/* Display session agenda if available */}
                  {session.sessionAgenda && session.sessionAgenda.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="text-xs text-gray-400 font-medium mb-1">Session Agenda:</div>
                      <ul className="text-xs text-gray-300 space-y-1">
                        {session.sessionAgenda.map((keyword, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-primary mr-1 mt-0.5">•</span>
                            <span className="line-clamp-1">{keyword}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Display requested skill focus keywords if available */}
                  {session.requestedSkillFocusKeywords && session.requestedSkillFocusKeywords.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="text-xs text-gray-400 font-medium mb-1">Requested Skill Focus:</div>
                      <ul className="text-xs text-gray-300 space-y-1">
                        {session.requestedSkillFocusKeywords.map((keyword, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-orange-400 mr-1 mt-0.5">•</span>
                            <span className="line-clamp-1">{keyword}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-1 text-sm text-gray-400 mb-3">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1.5" />
                    <span>{formatDate(session.date)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1.5" />
                    <span>
                      {session.startTime} - {session.endTime}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Host</div>
                    <UserProfile 
                      user={{ ...session.hostId, name: (currentUserId && session.hostId?._id === currentUserId) ? 'You' : session.hostId?.name }} 
                      showEmail={false} 
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Requested by</div>
                    <UserProfile 
                      user={{ ...session.requestedBy, name: (currentUserId && session.requestedBy?._id === currentUserId) ? 'You' : session.requestedBy?.name }} 
                      showEmail={false} 
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  {session.meetingLink && session.meetingLink.trim() !== '' && (
                    <a
                      href={session.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
                    >
                      Join Now
                    </a>
                  )}
                  {session.status !== 'completed' && session.status !== 'cancelled' && session.status !== 'expired' && (
                    <button
                      onClick={() => handleCompleteClick(session._id)}
                      disabled={completingSessions.has(session._id)}
                      className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {completingSessions.has(session._id) ? 'Completing...' : 'Mark as Complete'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Mark as Complete */}
      <Dialog open={!!confirmCompleteSession} onOpenChange={() => setConfirmCompleteSession(null)}>
        <DialogContent className="bg-gray-900 border border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Mark session as complete?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-300">
            This will set the status of the exchange session to completed. You can't undo this action.
          </p>
          <DialogFooter>
            <button
              className="px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-800 rounded-md hover:bg-gray-700"
              onClick={handleCancelComplete}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-60"
              onClick={handleConfirmComplete}
              disabled={completingSessions.has(confirmCompleteSession || '')}
            >
              {completingSessions.has(confirmCompleteSession || '') ? 'Completing...' : 'Confirm'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExchangeSessionsPage;


