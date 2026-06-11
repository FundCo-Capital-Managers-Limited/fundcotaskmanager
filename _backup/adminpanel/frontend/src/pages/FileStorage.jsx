import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Check,
  Copy,
  Download,
  Eye,
  File,
  FileText,
  Film,
  Folder,
  FolderOpen,
  FolderPlus,
  Grid3X3,
  HardDrive,
  Image,
  Info,
  Link2,
  List,
  Loader2,
  Move,
  RefreshCw,
  RotateCcw,
  Search,
  Star,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import userApi from '../utils/userApi.js';
import api from '../utils/api.js';
import { EmptyState, FilterChip, LoadingScreen, Modal, PageHeader, Panel, ProgressBar, SearchInput, StatCard, StatusPill } from '../components/ui.jsx';

const IPFS = 'https://gateway.pinata.cloud/ipfs';
const TOTAL_STORAGE = 2 * 1024 * 1024 * 1024;

const fmtSize = (bytes = 0) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const fileUrl = (file) => file?.fileUrl || (file?.cid ? `${IPFS}/${file.cid}` : '');

const taskIdOf = (file) => {
  const value = file?.taskId || file?.task?._id || file?.task;
  if (!value) return '';
  return typeof value === 'object' ? value._id || '' : value;
};

const taskTitleOf = (file, tasks = []) => {
  const id = taskIdOf(file);
  if (file?.taskTitle) return file.taskTitle;
  if (file?.task?.title) return file.task.title;
  return tasks.find((task) => String(task._id) === String(id))?.title || '';
};

const fileGroup = (type = '') => {
  const ext = type.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'image'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'video'].includes(ext)) return 'video';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv'].includes(ext)) return 'office';
  return 'file';
};

const typeIcon = {
  image: Image,
  video: Film,
  pdf: FileText,
  office: FileText,
  file: File,
};

const TypeIcon = ({ type, className = 'h-5 w-5' }) => {
  const Icon = typeIcon[fileGroup(type)] || File;
  const tone = fileGroup(type) === 'image' ? 'var(--c-success)' : fileGroup(type) === 'video' ? 'var(--brand-secondary)' : fileGroup(type) === 'pdf' ? 'var(--c-danger)' : 'var(--brand-primary)';
  return <Icon className={className} style={{ color: tone }} />;
};

const FileStorage = () => {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [showTrash, setShowTrash] = useState(false);
  const [loading, setLoading] = useState(true);
  const [storageUsed, setStorageUsed] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort] = useState('createdAt');
  const [view, setView] = useState('grid');
  const [selected, setSelected] = useState(new Set());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [detailsFile, setDetailsFile] = useState(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [folderName, setFolderName] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: 1,
        limit: 120,
        trashed: showTrash,
        folderId: showTrash ? undefined : (currentFolderId || 'null'),
        search: search || undefined,
        type: typeFilter === 'all' ? undefined : typeFilter,
        sort,
      };
      const [fileRes, folderRes, storageRes, taskRes] = await Promise.all([
        userApi.get('/api/files', { params }),
        userApi.get('/api/files/folders'),
        userApi.get('/api/files/storage'),
        api.get('/tasks', { params: { limit: 500 } }).catch(() => ({ data: { tasks: [] } })),
      ]);
      setFiles(fileRes.data.files || []);
      setFolders(folderRes.data.folders || []);
      setStorageUsed(storageRes.data.used || 0);
      setTasks(taskRes.data.tasks || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, search, showTrash, sort, typeFilter]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const currentFolders = useMemo(
    () => folders.filter((folder) => (folder.parentId || null) === (currentFolderId || null)),
    [folders, currentFolderId],
  );

  const breadcrumbs = useMemo(() => {
    const path = [];
    const byId = Object.fromEntries(folders.map((folder) => [folder._id, folder]));
    let id = currentFolderId;
    while (id && byId[id]) {
      path.unshift(byId[id]);
      id = byId[id].parentId;
    }
    return path;
  }, [folders, currentFolderId]);

  const storagePercent = Math.min(100, Math.round((storageUsed / TOTAL_STORAGE) * 100));

  const createFolder = async () => {
    if (!folderName.trim()) return toast.error('Folder name is required');
    try {
      await userApi.post('/api/files/folders', { name: folderName.trim(), parentId: currentFolderId || null });
      setFolderName('');
      toast.success('Folder created');
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create folder');
    }
  };

  const renameFolder = async (folder) => {
    const nextName = prompt('Rename folder', folder.name);
    if (!nextName?.trim() || nextName.trim() === folder.name) return;
    try {
      await userApi.patch(`/api/files/folders/${folder._id}`, { name: nextName.trim() });
      toast.success('Folder renamed');
      fetchAll();
    } catch {
      toast.error('Failed to rename folder');
    }
  };

  const deleteFolder = async (folderId) => {
    if (!confirm('Delete this folder? Files inside it will move according to your storage API rules.')) return;
    try {
      await userApi.delete(`/api/files/folders/${folderId}`);
      if (currentFolderId === folderId) setCurrentFolderId(null);
      toast.success('Folder deleted');
      fetchAll();
    } catch {
      toast.error('Failed to delete folder');
    }
  };

  const softDelete = async (id) => {
    try {
      await userApi.patch(`/api/files/${id}/soft-delete`);
      setFiles((current) => current.filter((file) => file._id !== id));
      toast.success('Moved to trash');
    } catch {
      toast.error('Failed to delete file');
    }
  };

  const restoreFile = async (id) => {
    try {
      await userApi.patch(`/api/files/${id}/restore`);
      setFiles((current) => current.filter((file) => file._id !== id));
      toast.success('File restored');
    } catch {
      toast.error('Failed to restore file');
    }
  };

  const permanentDelete = async (id) => {
    if (!confirm('Permanently delete this file? This cannot be undone.')) return;
    try {
      await userApi.delete(`/api/files/${id}`);
      setFiles((current) => current.filter((file) => file._id !== id));
      toast.success('File permanently deleted');
    } catch {
      toast.error('Failed to delete file');
    }
  };

  const toggleStar = async (id) => {
    try {
      const { data } = await userApi.patch(`/api/files/${id}/star`);
      setFiles((current) => current.map((file) => (file._id === id ? { ...file, starred: data.starred } : file)));
    } catch {
      toast.error('Failed to update file');
    }
  };

  const moveSelected = async (folderId) => {
    const fileIds = Array.from(selected);
    if (!fileIds.length) return;
    try {
      await userApi.post('/api/files/move', { fileIds, folderId: folderId || null });
      setSelected(new Set());
      setMoveOpen(false);
      toast.success('Files moved');
      fetchAll();
    } catch {
      toast.error('Failed to move files');
    }
  };

  const updateDetailsFile = (file) => {
    setDetailsFile(file);
    setFiles((current) => current.map((item) => (item._id === file._id ? file : item)));
  };

  const toggleSelect = (id) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="File Storage"
        actions={
          <>
            <button className="btn-secondary" onClick={fetchAll}><RefreshCw className="h-4 w-4" />Refresh</button>
            <button className="btn-primary" onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4" />Upload Files</button>
          </>
        }
        aside={<StatusPill tone="secondary">{fmtSize(storageUsed)} used</StatusPill>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Files" value={files.length} icon={HardDrive} tone="var(--brand-primary)" helper="Files in the current view" />
        <StatCard label="Folders" value={folders.length} icon={Folder} tone="var(--brand-secondary)" helper="Folder records in your storage" />
        <StatCard label="Selected" value={selected.size} icon={Check} tone="var(--c-success)" helper="Files ready for bulk action" />
        <StatCard label="Storage" value={`${storagePercent}%`} icon={HardDrive} tone="var(--c-warning)" helper={`${fmtSize(storageUsed)} of ${fmtSize(TOTAL_STORAGE)}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[18rem_1fr]">
        <aside className="space-y-4">
          <Panel title="Drive" subtitle="Folder tree and storage use">
            <div className="space-y-4">
              <button className="btn-secondary w-full justify-start" onClick={() => { setShowTrash(false); setCurrentFolderId(null); }}>
                <FolderOpen className="h-4 w-4" />
                My Drive
              </button>
              <button className="btn-secondary w-full justify-start" onClick={() => { setShowTrash(true); setCurrentFolderId(null); }}>
                <Trash2 className="h-4 w-4" />
                Trash
              </button>
              <div className="flex gap-2">
                <input className="input-base min-h-11" value={folderName} onChange={(event) => setFolderName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') createFolder(); }} placeholder="New folder" />
                <button className="btn-primary h-11 w-11 shrink-0 rounded-full p-0" onClick={createFolder}><FolderPlus className="h-4 w-4" /></button>
              </div>
              <div className="space-y-2">
                {folders.filter((folder) => !folder.parentId).map((folder) => (
                  <FolderTree key={folder._id} folder={folder} folders={folders} activeId={currentFolderId} onSelect={(id) => { setShowTrash(false); setCurrentFolderId(id); }} />
                ))}
              </div>
              <div>
                <div className="mb-2 flex justify-between text-xs font-bold" style={{ color: 'var(--c-text-muted)' }}>
                  <span>{fmtSize(storageUsed)}</span>
                  <span>{storagePercent}%</span>
                </div>
                <ProgressBar value={storagePercent} tone={storagePercent > 90 ? 'var(--c-danger)' : 'var(--brand-primary)'} />
              </div>
            </div>
          </Panel>
        </aside>

        <main className="space-y-4">
          <Panel title={showTrash ? 'Trash' : 'Storage Browser'} subtitle="Search, filter, and manage files">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 flex-1">
                <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search files..." icon={Search} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {['all', 'pdf', 'docx', 'jpg', 'png', 'mp4', 'xlsx', 'pptx'].map((item) => (
                  <FilterChip key={item} active={typeFilter === item} onClick={() => setTypeFilter(item)}>{item === 'all' ? 'All' : item}</FilterChip>
                ))}
              </div>
              <select className="input-base w-auto min-w-36" value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="createdAt">Date</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
              </select>
              <div className="flex rounded-full border p-1" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                <button className="btn-ghost h-9 w-9 rounded-full p-0" style={view === 'grid' ? { background: 'var(--c-panel)' } : undefined} onClick={() => setView('grid')}><Grid3X3 className="h-4 w-4" /></button>
                <button className="btn-ghost h-9 w-9 rounded-full p-0" style={view === 'list' ? { background: 'var(--c-panel)' } : undefined} onClick={() => setView('list')}><List className="h-4 w-4" /></button>
              </div>
            </div>
          </Panel>

          {breadcrumbs.length && !showTrash ? (
            <div className="surface-panel px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-sm font-bold" style={{ color: 'var(--c-text-muted)' }}>
                <button onClick={() => setCurrentFolderId(null)} style={{ color: 'var(--brand-primary)' }}>My Drive</button>
                {breadcrumbs.map((folder) => (
                  <React.Fragment key={folder._id}>
                    <span>/</span>
                    <button onClick={() => setCurrentFolderId(folder._id)} style={{ color: 'var(--brand-primary)' }}>{folder.name}</button>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : null}

          {selected.size ? (
            <div className="surface-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm font-black" style={{ color: 'var(--brand-primary)' }}>{selected.size} selected</span>
              <div className="flex flex-wrap gap-2">
                {!showTrash ? <button className="btn-secondary" onClick={() => setMoveOpen(true)}><Move className="h-4 w-4" />Move</button> : null}
                <button className="btn-danger" onClick={() => Array.from(selected).forEach((id) => (showTrash ? permanentDelete(id) : softDelete(id)))}>
                  <Trash2 className="h-4 w-4" />
                  {showTrash ? 'Delete forever' : 'Move to trash'}
                </button>
                <button className="btn-ghost" onClick={() => setSelected(new Set())}>Clear</button>
              </div>
            </div>
          ) : null}

          {loading ? (
            <LoadingScreen height="24rem" />
          ) : (
            <>
              {!showTrash && currentFolders.length ? (
                <section className="space-y-3">
                  <p className="section-title">Folders</p>
                  <div className={view === 'grid' ? 'grid gap-3 md:grid-cols-2 xl:grid-cols-4' : 'space-y-2'}>
                    {currentFolders.map((folder) => (
                      <FolderCard key={folder._id} folder={folder} view={view} onOpen={() => setCurrentFolderId(folder._id)} onRename={() => renameFolder(folder)} onDelete={() => deleteFolder(folder._id)} />
                    ))}
                  </div>
                </section>
              ) : null}

              {files.length ? (
                <section className="space-y-3">
                  <p className="section-title">{showTrash ? 'Trash' : 'Files'}</p>
                  <div className={view === 'grid' ? 'grid gap-3 md:grid-cols-2 xl:grid-cols-4' : 'space-y-2'}>
                    {files.map((file) => (
                      showTrash ? (
                        <TrashRow key={file._id} file={file} onRestore={() => restoreFile(file._id)} onDelete={() => permanentDelete(file._id)} />
                      ) : view === 'grid' ? (
                        <FileCard
                          key={file._id}
                          file={file}
                          selected={selected.has(file._id)}
                          onSelect={() => toggleSelect(file._id)}
                          onPreview={() => setPreviewFile(file)}
                          onDetails={() => setDetailsFile(file)}
                          onDelete={() => softDelete(file._id)}
                          onStar={() => toggleStar(file._id)}
                        />
                      ) : (
                        <FileRow
                          key={file._id}
                          file={file}
                          selected={selected.has(file._id)}
                          onSelect={() => toggleSelect(file._id)}
                          onPreview={() => setPreviewFile(file)}
                          onDetails={() => setDetailsFile(file)}
                          onDelete={() => softDelete(file._id)}
                          onStar={() => toggleStar(file._id)}
                        />
                      )
                    ))}
                  </div>
                </section>
              ) : currentFolders.length === 0 ? (
                <EmptyState icon={HardDrive} title={showTrash ? 'Trash is empty' : 'No files here'} description={showTrash ? 'Deleted files will appear here.' : 'Upload files or create folders to organize your admin storage.'} action={!showTrash ? <button className="btn-primary" onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4" />Upload Files</button> : null} />
              ) : null}
            </>
          )}
        </main>
      </div>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} folderId={currentFolderId} tasks={tasks} onDone={fetchAll} />
      <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      <DetailsModal file={detailsFile} tasks={tasks} onClose={() => setDetailsFile(null)} onChange={updateDetailsFile} />
      <MoveModal open={moveOpen} onClose={() => setMoveOpen(false)} folders={folders} onMove={moveSelected} />
    </div>
  );
};

const FolderTree = ({ folder, folders, activeId, onSelect, depth = 0 }) => {
  const [open, setOpen] = useState(false);
  const children = folders.filter((item) => item.parentId === folder._id);
  const active = activeId === folder._id;

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-[1rem] px-3 py-2 text-left text-sm font-bold"
        style={{ paddingLeft: 12 + depth * 14, background: active ? 'var(--brand-primary-soft)' : 'transparent', color: active ? 'var(--brand-primary)' : 'var(--c-text-soft)' }}
        onClick={() => {
          setOpen((current) => !current);
          onSelect(folder._id);
        }}
      >
        {open ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
        <span className="truncate">{folder.name}</span>
      </button>
      {open ? children.map((child) => <FolderTree key={child._id} folder={child} folders={folders} activeId={activeId} onSelect={onSelect} depth={depth + 1} />) : null}
    </div>
  );
};

const FolderCard = ({ folder, view, onOpen, onRename, onDelete }) => (
  <div className={`card card-hover ${view === 'grid' ? 'p-4' : 'flex items-center gap-3 p-3'}`}>
    <button type="button" onClick={onOpen} className={`min-w-0 flex-1 text-left ${view === 'grid' ? '' : 'flex items-center gap-3'}`}>
      <Folder className={view === 'grid' ? 'mb-4 h-10 w-10' : 'h-6 w-6'} style={{ color: 'var(--c-warning)' }} />
      <span className="block truncate text-sm font-black" style={{ color: 'var(--c-text)' }}>{folder.name}</span>
    </button>
    <div className="mt-3 flex gap-2">
      <button className="btn-ghost h-9 w-9 rounded-full p-0" onClick={onRename}><Info className="h-4 w-4" /></button>
      <button className="btn-danger h-9 w-9 rounded-full p-0" onClick={onDelete}><Trash2 className="h-4 w-4" /></button>
    </div>
  </div>
);

const FileCard = ({ file, selected, onSelect, onPreview, onDetails, onDelete, onStar }) => (
  <div className="card card-hover overflow-hidden">
    <div className="relative flex h-36 items-center justify-center" style={{ background: 'var(--c-panel-subtle)' }} onClick={onPreview}>
      {fileGroup(file.type) === 'image' ? <img src={fileUrl(file)} alt={file.fileName} className="h-full w-full object-cover" /> : <TypeIcon type={file.type} className="h-12 w-12" />}
      <button className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border" style={{ borderColor: selected ? 'var(--brand-primary)' : 'var(--c-border)', background: selected ? 'var(--brand-primary)' : 'var(--c-panel)', color: '#fff' }} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
        {selected ? <Check className="h-3.5 w-3.5" /> : null}
      </button>
      <button className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'var(--c-panel)', color: file.starred ? 'var(--c-warning)' : 'var(--c-text-muted)' }} onClick={(event) => { event.stopPropagation(); onStar(); }}>
        <Star className="h-4 w-4" fill={file.starred ? 'currentColor' : 'none'} />
      </button>
    </div>
    <div className="p-4">
      <p className="truncate text-sm font-black" style={{ color: 'var(--c-text)' }}>{file.fileName}</p>
      <p className="mt-1 text-xs" style={{ color: 'var(--c-text-muted)' }}>{(file.type || '').toUpperCase()} · {fmtSize(file.size)}</p>
      {file.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {file.tags.slice(0, 3).map((tag) => <span key={tag} className="badge" style={{ background: 'var(--c-panel-subtle)', color: 'var(--c-text-muted)', minHeight: 22 }}>{tag}</span>)}
        </div>
      ) : null}
      <div className="mt-4 flex gap-2">
        <button className="btn-secondary h-9 flex-1 px-3 text-xs" onClick={onDetails}><Info className="h-3.5 w-3.5" />Details</button>
        <button className="btn-danger h-9 w-9 rounded-full p-0" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  </div>
);

const FileRow = ({ file, selected, onSelect, onPreview, onDetails, onDelete, onStar }) => (
  <div className="card card-hover flex items-center gap-3 p-3">
    <button className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: selected ? 'var(--brand-primary)' : 'var(--c-border)', background: selected ? 'var(--brand-primary)' : 'transparent', color: '#fff' }} onClick={onSelect}>
      {selected ? <Check className="h-3.5 w-3.5" /> : null}
    </button>
    <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={onPreview}>
      <TypeIcon type={file.type} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black" style={{ color: 'var(--c-text)' }}>{file.fileName}</span>
        <span className="text-xs" style={{ color: 'var(--c-text-muted)' }}>{(file.type || '').toUpperCase()} · {fmtSize(file.size)}</span>
      </span>
    </button>
    <button className="btn-ghost h-9 w-9 rounded-full p-0" onClick={onStar} style={{ color: file.starred ? 'var(--c-warning)' : undefined }}><Star className="h-4 w-4" fill={file.starred ? 'currentColor' : 'none'} /></button>
    <button className="btn-ghost h-9 w-9 rounded-full p-0" onClick={onDetails}><Info className="h-4 w-4" /></button>
    <button className="btn-danger h-9 w-9 rounded-full p-0" onClick={onDelete}><Trash2 className="h-4 w-4" /></button>
  </div>
);

const TrashRow = ({ file, onRestore, onDelete }) => (
  <div className="card flex items-center gap-3 p-3">
    <TypeIcon type={file.type} />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-black" style={{ color: 'var(--c-text)' }}>{file.fileName}</p>
      <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>{fmtSize(file.size)}</p>
    </div>
    <button className="btn-secondary" onClick={onRestore}><RotateCcw className="h-4 w-4" />Restore</button>
    <button className="btn-danger" onClick={onDelete}><Trash2 className="h-4 w-4" />Delete</button>
  </div>
);

const UploadModal = ({ open, onClose, folderId, tasks = [], onDone }) => {
  const [files, setFiles] = useState([]);
  const [tags, setTags] = useState('');
  const [taskId, setTaskId] = useState('');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setFiles([]);
    setTags('');
    setTaskId('');
  }, [open]);

  const upload = async () => {
    if (!files.length) return toast.error('Select files to upload');
    setUploading(true);
    try {
      const form = new FormData();
      files.forEach((file) => form.append('files', file));
      if (folderId) form.append('folderId', folderId);
      if (taskId) form.append('taskId', taskId);
      if (tags.trim()) form.append('tags', JSON.stringify(tags.split(',').map((tag) => tag.trim()).filter(Boolean)));
      await userApi.post('/api/files/upload', form);
      toast.success('Files uploaded');
      onDone();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload files" subtitle="Upload to your admin storage workspace." width="max-w-2xl">
      <div className="space-y-4">
        <button type="button" className="flex w-full flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed px-6 py-10 text-center" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }} onClick={() => inputRef.current?.click()}>
          <Upload className="mb-3 h-8 w-8" style={{ color: 'var(--brand-primary)' }} />
          <span className="font-black" style={{ color: 'var(--c-text)' }}>Choose files</span>
          <span className="mt-1 text-sm" style={{ color: 'var(--c-text-muted)' }}>PDF, Office docs, images, video, archives, and text files</span>
        </button>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(event) => setFiles(Array.from(event.target.files || []))} />
        {files.length ? (
          <div className="space-y-2">
            {files.map((file) => (
              <div key={`${file.name}-${file.size}`} className="flex items-center gap-3 rounded-[1rem] border px-3 py-2" style={{ borderColor: 'var(--c-border)' }}>
                <TypeIcon type={file.name.split('.').pop()} />
                <span className="min-w-0 flex-1 truncate text-sm font-bold" style={{ color: 'var(--c-text)' }}>{file.name}</span>
                <span className="text-xs" style={{ color: 'var(--c-text-muted)' }}>{fmtSize(file.size)}</span>
              </div>
            ))}
          </div>
        ) : null}
        <div>
          <label className="label">Link to task</label>
          <select className="input-base" value={taskId} onChange={(event) => setTaskId(event.target.value)}>
            <option value="">No linked task</option>
            {tasks.map((task) => (
              <option key={task._id} value={task._id}>
                {task.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Tags</label>
          <input className="input-base" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="finance, q2, review" />
        </div>
        <button className="btn-primary w-full" onClick={upload} disabled={uploading || !files.length}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </Modal>
  );
};

const PreviewModal = ({ file, onClose }) => {
  const url = fileUrl(file);
  const group = fileGroup(file?.type);

  return (
    <Modal open={!!file} onClose={onClose} title={file?.fileName || 'Preview'} subtitle={`${(file?.type || '').toUpperCase()} · ${fmtSize(file?.size)}`} width="max-w-5xl">
      {file ? (
        <div className="space-y-4">
          <div className="max-h-[65vh] overflow-auto rounded-[1.25rem] border p-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
            {group === 'image' ? (
              <img src={url} alt={file.fileName} className="mx-auto max-h-[62vh] rounded-[1rem] object-contain" />
            ) : group === 'video' ? (
              <video src={url} controls className="mx-auto max-h-[62vh] max-w-full rounded-[1rem] bg-black" />
            ) : group === 'pdf' || group === 'office' ? (
              <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`} className="h-[62vh] w-full rounded-[1rem] border-0" title="File preview" />
            ) : (
              <EmptyState icon={File} title="Preview unavailable" description="Open or download the file to inspect it." />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="btn-primary" href={url} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" />Open</a>
            <a className="btn-secondary" href={url} download={file.fileName}><Download className="h-4 w-4" />Download</a>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

const DetailsModal = ({ file, tasks = [], onClose, onChange }) => {
  const [tags, setTags] = useState('');
  const [taskId, setTaskId] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTags((file?.tags || []).join(', '));
    setTaskId(taskIdOf(file));
    setShareLink(file?.shareLink || '');
  }, [file]);

  const saveTags = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const nextTags = tags.split(',').map((tag) => tag.trim()).filter(Boolean);
      const { data } = await userApi.patch(`/api/files/${file._id}/tags`, { tags: nextTags });
      const nextFile = data.file || { ...file, tags: nextTags };
      onChange(nextFile);
      toast.success('Tags updated');
    } catch {
      toast.error('Failed to update tags');
    } finally {
      setSaving(false);
    }
  };

  const createShareLink = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const { data } = await userApi.post(`/api/files/${file._id}/share`, { expiresInDays: 7 });
      setShareLink(data.shareLink);
      await navigator.clipboard.writeText(data.shareLink);
      toast.success('Share link copied');
    } catch {
      toast.error('Failed to create share link');
    } finally {
      setSaving(false);
    }
  };

  const saveTask = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const { data } = await userApi.patch(`/api/files/${file._id}/task`, { taskId: taskId || null });
      const linkedTitle = tasks.find((task) => String(task._id) === String(taskId))?.title || '';
      const nextFile = data.file || {
        ...file,
        taskId: taskId || null,
        taskTitle: linkedTitle,
      };
      onChange(nextFile);
      toast.success(taskId ? 'Task linked' : 'Task link removed');
    } catch {
      toast.error('Failed to update linked task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!file} onClose={onClose} title="File details" subtitle={file?.fileName} width="max-w-2xl">
      {file ? (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.25rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
              <p className="section-title">Type</p>
              <p className="mt-2 font-black" style={{ color: 'var(--c-text)' }}>{(file.type || 'file').toUpperCase()}</p>
            </div>
            <div className="rounded-[1.25rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
              <p className="section-title">Size</p>
              <p className="mt-2 font-black" style={{ color: 'var(--c-text)' }}>{fmtSize(file.size)}</p>
            </div>
            <div className="rounded-[1.25rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
              <p className="section-title">Created</p>
              <p className="mt-2 font-black" style={{ color: 'var(--c-text)' }}>{file.createdAt ? new Date(file.createdAt).toLocaleDateString() : '-'}</p>
            </div>
          </div>
          <div>
            <label className="label">Tags</label>
            <div className="flex gap-2">
              <input className="input-base" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="comma, separated, tags" />
              <button className="btn-primary" onClick={saveTags} disabled={saving}><Tag className="h-4 w-4" />Save</button>
            </div>
          </div>
          <div>
            <label className="label">Linked task</label>
            <div className="flex gap-2">
              <select className="input-base" value={taskId} onChange={(event) => setTaskId(event.target.value)}>
                <option value="">No linked task</option>
                {tasks.map((task) => (
                  <option key={task._id} value={task._id}>
                    {task.title}
                  </option>
                ))}
              </select>
              <button className="btn-primary" onClick={saveTask} disabled={saving}>
                <Check className="h-4 w-4" />
                Save
              </button>
            </div>
            {taskTitleOf(file, tasks) ? (
              <p className="mt-2 text-xs font-bold" style={{ color: 'var(--c-text-muted)' }}>
                Current: {taskTitleOf(file, tasks)}
              </p>
            ) : null}
          </div>
          <div>
            <label className="label">Share link</label>
            {shareLink ? (
              <div className="flex gap-2">
                <input className="input-base" value={shareLink} readOnly />
                <button className="btn-secondary" onClick={() => { navigator.clipboard.writeText(shareLink); toast.success('Copied'); }}><Copy className="h-4 w-4" />Copy</button>
              </div>
            ) : (
              <button className="btn-secondary" onClick={createShareLink} disabled={saving}><Link2 className="h-4 w-4" />Create 7-day link</button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={fileUrl(file)} target="_blank" rel="noreferrer" className="btn-primary"><Eye className="h-4 w-4" />Open</a>
            <a href={fileUrl(file)} download={file.fileName} className="btn-secondary"><Download className="h-4 w-4" />Download</a>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

const MoveModal = ({ open, onClose, folders, onMove }) => {
  const [folderId, setFolderId] = useState('');

  useEffect(() => {
    if (open) setFolderId('');
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Move files" subtitle="Choose a destination folder." width="max-w-lg">
      <div className="space-y-4">
        <select className="input-base" value={folderId} onChange={(event) => setFolderId(event.target.value)}>
          <option value="">Root folder</option>
          {folders.map((folder) => <option key={folder._id} value={folder._id}>{folder.name}</option>)}
        </select>
        <button className="btn-primary w-full" onClick={() => onMove(folderId || null)}><Move className="h-4 w-4" />Move files</button>
      </div>
    </Modal>
  );
};

export default FileStorage;
