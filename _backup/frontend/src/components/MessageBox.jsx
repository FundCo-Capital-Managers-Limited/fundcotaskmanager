// MessageBox.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Check, CheckCheck, AlertCircle } from 'lucide-react';

const MessageBox = ({ msg, isSender, onClick, selected, onToggleSelect, openMediaViewer, user, selectionMode, chatType, members }) => {
  const isDeleted = msg.isDeleted;
  const timestamp = msg.createdAt ? format(new Date(msg.createdAt), 'h:mm a') : 'Unknown';
  const readCount = msg.readBy ? msg.readBy.length - 1 : 0; // exclude self
  const isReadByAll = chatType === 'group' ? readCount === members.length - 1 : msg.readBy.some(rb => rb.userId !== user._id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`my-3 flex ${isSender ? 'justify-end' : 'justify-start'} group relative`}
      onClick={onClick}
    >
      {/* Receiver Avatar */}
      {!isSender && (
        <div className="flex-shrink-0 mr-2 mt-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {msg.sender?.name ? msg.sender.name.charAt(0).toUpperCase() : '?'}
          </div>
        </div>
      )}

      <div className={`max-w-[70%] relative ${isSender ? 'ml-auto' : 'mr-auto'}`}>
        {/* Message Bubble */}
        <div
          className={`relative p-4 rounded-2xl shadow-md text-sm leading-relaxed transition-all duration-200 ${
            isSender
              ? 'bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] text-white rounded-br-none'
              : 'bg-gray-100 dark:bg-gray-700 text-[#1F2937] dark:text-gray-200 rounded-bl-none shadow-sm border border-gray-200 dark:border-gray-700'
          } ${selected ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-blue-400 scale-105' : 'hover:scale-[1.01]'}`}
        >
          {/* Selection Checkbox - Show only in selection mode */}
          {selectionMode && !isDeleted && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(msg._id)}
              className={`absolute top-3 ${isSender ? 'right-3' : 'left-3'} h-4 w-4 accent-white dark:accent-blue-400 border-2 border-white dark:border-gray-300 rounded cursor-pointer`}
            />
          )}

          {/* Sender Name (for receiver only) */}
          {!isSender && (
            <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1.5 tracking-wide">
              {msg.sender?.name || 'Anonymous'}
            </p>
          )}

          {/* Deleted Message */}
          {isDeleted ? (
            <div className="flex items-center gap-2 text-xs italic text-gray-400 dark:text-gray-500 py-1">
              <AlertCircle className="w-4 h-4" />
              <span>This message was deleted</span>
            </div>
          ) : (
            <>
              {/* Text Content */}
              {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

              {/* Edited Indicator */}
              {msg.isEdited && (
                <p className={`text-[10px] italic mt-1 ${isSender ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'}`}>
                  Edited
                </p>
              )}

              {/* File Attachments */}
              {msg.fileUrl && (
                <div className="mt-3 rounded-xl overflow-hidden border border-white/20 dark:border-gray-700/50 shadow-sm">
                  {msg.contentType === 'image' && (
                    <img
                      src={msg.fileUrl}
                      alt={msg.fileName || 'Image'}
                      className="max-w-full h-auto rounded-xl cursor-pointer hover:brightness-90 transition-all"
                      onClick={() => openMediaViewer(msg.fileUrl, 'image', msg.fileName || 'Image')}
                    />
                  )}
                  {msg.contentType === 'video' && (
                    <video
                      src={msg.fileUrl}
                      controls
                      className="max-w-full rounded-xl"
                    />
                  )}
                  {msg.contentType === 'audio' && (
                    <audio src={msg.fileUrl} controls className="w-full p-1" />
                  )}
                  {(msg.contentType === 'application' || msg.contentType === '') && (
                    <div className="bg-white dark:bg-gray-700 p-4 flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                        📄
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{msg.fileName || 'Document'}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">PDF • {msg.fileUrl.split('.').pop().toUpperCase()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openMediaViewer(msg.fileUrl, 'application', msg.fileName || 'Document')}
                          className={`text-xs px-3 py-1 rounded-full ${isSender ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-blue-500 text-white hover:bg-blue-600'} transition-all`}
                        >
                          View
                        </button>
                        <a
                          href={msg.fileUrl}
                          download={msg.fileName || 'Document'}
                          className={`text-xs px-3 py-1 rounded-full ${isSender ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'} transition-all`}
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Timestamp + Read Status */}
          <div className={`flex items-center gap-1 mt-2 text-[10px] ${isSender ? 'justify-end text-white/70' : 'justify-start text-gray-500 dark:text-gray-400'}`}>
            <span>{timestamp}</span>
            {isSender && (
              <span className="flex items-center gap-0.5">
                {isReadByAll ? <CheckCheck className="w-3 h-3 text-blue-300" /> : <CheckCheck className="w-3 h-3 text-gray-300" />}
              </span>
            )}
          </div>

          {/* Tail for Bubble */}
          {isSender ? (
            <div className="absolute bottom-0 right-[-8px] w-4 h-4 bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] rotate-45 rounded-br-2xl" />
          ) : (
            <div className="absolute bottom-0 left-[-8px] w-4 h-4 bg-white dark:bg-gray-800 rotate-45 rounded-bl-2xl" />
          )}
        </div>
      </div>

      {/* Sender Avatar (small, only on hover) */}
      {isSender && (
        <div className="flex-shrink-0 ml-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MessageBox;