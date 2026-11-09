import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext.js';
import { AuthModal } from './components/AuthModal.js';
import { Navbar } from './components/Navbar.js';
import { DirectoryView } from './components/DirectoryView.js';
import { WorkspaceView } from './components/WorkspaceView.js';
import { CreateProjectModal } from './components/CreateProjectModal.js';
import { InviteModal } from './components/InviteModal.js';
import { api } from './services/api.js';

export const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inviteModalData, setInviteModalData] = useState<{ projectId: string; projectName: string } | null>(null);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);

  // Check URL hash for invite link: #invite=TOKEN
  useEffect(() => {
    if (!user) return;

    const hash = window.location.hash;
    if (hash.startsWith('#invite=')) {
      const token = hash.replace('#invite=', '');
      if (token) {
        setInviteNotice('Joining project via invite token...');
        api
          .post(`/invites/${token}/accept`)
          .then((res) => {
            setInviteNotice(`Joined project with ${res.data.role} access! Opening...`);
            setTimeout(() => {
              window.location.hash = '';
              setInviteNotice(null);
              setSelectedProjectId(res.data.projectId);
            }, 1000);
          })
          .catch((err) => {
            setInviteNotice(`Invite Error: ${err.response?.data?.error || 'Failed to accept invite'}`);
            setTimeout(() => {
              window.location.hash = '';
              setInviteNotice(null);
            }, 3000);
          });
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0f0f11] text-zinc-400 text-sm">
        Initializing CoDev...
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen bg-[#0f0f11] text-zinc-100 flex flex-col font-['Inter',sans-serif]">
      {/* Toast Notice for Invites */}
      {inviteNotice && (
        <div className="fixed top-4 right-4 z-50 bg-indigo-600 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold animate-bounce">
          {inviteNotice}
        </div>
      )}

      {selectedProjectId ? (
        <WorkspaceView
          projectId={selectedProjectId}
          onBackToDirectory={() => setSelectedProjectId(null)}
        />
      ) : (
        <>
          <Navbar />
          <main className="flex-1">
            <DirectoryView
              onSelectProject={(id) => setSelectedProjectId(id)}
              onCreateNew={() => setShowCreateModal(true)}
              onInvite={(id, name) => setInviteModalData({ projectId: id, projectName: name })}
            />
          </main>
        </>
      )}

      {/* Global Modals */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(project) => {
          setSelectedProjectId(project.id);
        }}
      />

      {inviteModalData && (
        <InviteModal
          isOpen={true}
          onClose={() => setInviteModalData(null)}
          projectId={inviteModalData.projectId}
          projectName={inviteModalData.projectName}
        />
      )}
    </div>
  );
};
