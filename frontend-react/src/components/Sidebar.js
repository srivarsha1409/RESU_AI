import React from 'react';
import { FileText, Target, Briefcase, MessageSquare, TrendingUp, Users, LogOut, User, Menu, X } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, userName, onLogout, isCollapsed, setIsCollapsed }) => {
  const menuItems = [
    { id: 'analysis', label: 'Resume Analysis', icon: FileText },
    { id: 'ats', label: 'ATS Analysis', icon: Target },
    { id: 'roles', label: 'Role Recommendation', icon: Briefcase },
    { id: 'assistant', label: 'AI Assistant', icon: MessageSquare },
    { id: 'guidance', label: 'Guidance', icon: TrendingUp },
    { id: 'referrals', label: 'Referrals', icon: Users },
  ];

  return (
    <div 
      style={{
        width: isCollapsed ? '80px' : '260px',
        height: '100vh',
        background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
        borderRight: '1px solid rgba(139, 92, 246, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 50,
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.1)'
      }}
    >
      {/* Header */}
      <div style={{
        padding: isCollapsed ? '20px 16px' : '24px 20px',
        borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
        background: 'rgba(0, 0, 0, 0.2)'
      }}>
        {/* Logo/Brand */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          marginBottom: isCollapsed ? '0' : '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
            }}>
              <FileText size={20} style={{ color: 'white' }} />
            </div>
            {!isCollapsed && (
              <div>
                <h3 style={{
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '700',
                  margin: 0,
                  lineHeight: '1.2'
                }}>
                  Resume Insight
                </h3>
                <p style={{
                  color: '#a78bfa',
                  fontSize: '12px',
                  margin: 0,
                  marginTop: '2px'
                }}>
                  AI Platform
                </p>
              </div>
            )}
          </div>
          
          {/* Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: 'rgba(139, 92, 246, 0.2)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(139, 92, 246, 0.3)';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(139, 92, 246, 0.2)';
              e.target.style.transform = 'scale(1)';
            }}
          >
            {isCollapsed ? (
              <Menu size={18} style={{ color: '#a78bfa' }} />
            ) : (
              <X size={18} style={{ color: '#a78bfa' }} />
            )}
          </button>
        </div>

        {/* User Info */}
        {!isCollapsed && userName && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            background: 'rgba(139, 92, 246, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(139, 92, 246, 0.2)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={18} style={{ color: 'white' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {userName}
              </p>
              <p style={{
                color: '#a78bfa',
                fontSize: '12px',
                margin: 0
              }}>
                User Dashboard
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <div style={{
        flex: 1,
        padding: '20px 12px',
        overflowY: 'auto'
      }}>
        <div style={{ spaceY: '8px' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isCollapsed ? '0' : '12px',
                  padding: isCollapsed ? '16px 12px' : '14px 16px',
                  borderRadius: '12px',
                  border: isActive ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid transparent',
                  background: isActive 
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(99, 102, 241, 0.2) 100%)' 
                    : 'transparent',
                  color: isActive ? 'white' : '#a78bfa',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: isActive ? '600' : '500',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.target.style.background = 'rgba(139, 92, 246, 0.1)';
                    e.target.style.transform = 'translateX(4px)';
                    e.target.style.color = 'white';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.target.style.background = 'transparent';
                    e.target.style.transform = 'translateX(0)';
                    e.target.style.color = '#a78bfa';
                  }
                }}
              >
                {/* Active indicator */}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '4px',
                    height: '24px',
                    background: 'linear-gradient(180deg, #8b5cf6 0%, #6366f1 100%)',
                    borderRadius: '0 4px 4px 0'
                  }} />
                )}
                
                <Icon 
                  size={20} 
                  style={{ 
                    flexShrink: 0,
                    filter: isActive ? 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.5))' : 'none'
                  }} 
                />
                
                {!isCollapsed && (
                  <span style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer with Logout */}
      <div style={{
        padding: '20px 12px',
        borderTop: '1px solid rgba(139, 92, 246, 0.2)',
        background: 'rgba(0, 0, 0, 0.2)'
      }}>
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: isCollapsed ? '0' : '12px',
            padding: isCollapsed ? '16px 12px' : '14px 16px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#fca5a5',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontSize: '14px',
            fontWeight: '500',
            justifyContent: isCollapsed ? 'center' : 'flex-start'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(239, 68, 68, 0.2)';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(239, 68, 68, 0.1)';
            e.target.style.transform = 'translateY(0)';
            e.target.style.color = '#fca5a5';
          }}
        >
          <LogOut size={20} style={{ flexShrink: 0 }} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
