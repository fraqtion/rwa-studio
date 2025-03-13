import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ControlledEditor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  ChevronDown,
  Save,
  FolderOpen,
  Folder,
  ArrowLeft,
  SplitSquareVertical,
  Maximize2,
  Image as ImageIcon,
  Box,
  FileCode,
  File as FileIcon,
  Home,
  Loader2,
  FilePlus,
  Upload,
  Music,
  Video,
  Trash2,
  X,
  ChevronLeft,
  Settings,
  Package,
  Download,
} from 'lucide-react';
import {
  FILE_TYPES,
  PREVIEW_SUPPORTED_TYPES,
  MAX_RECENT_FILES,
} from '@/common/interfaces/constants';
import { File, Folder as FolderType, Ownable } from '@/common/interfaces/files';
import useOwnableStore from '@/stores/ownableStore';
import AssetPreview from '@/components/preview/AssetPreview';
import {
  useAppDispatch,
  useAppSelector,
  setActiveProject,
} from '@/lib/redux/store';
import localStorageService from '@/common/services/localStorage';
import BuildSandbox from '@/components/studio/BuildSandbox';

// Add type declaration for the File System Access API
declare global {
  interface Window {
    showOpenFilePicker: (options?: {
      multiple?: boolean;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandle[]>;
  }
}

// Utility function to get file icon based on file type
const getFileIcon = (file: File) => {
  const fileType = FILE_TYPES[file.type];

  if (fileType === 'image')
    return <ImageIcon className="h-4 w-4 text-blue-400" />;
  if (fileType === '3d') return <Box className="h-4 w-4 text-purple-400" />;
  if (fileType === 'audio') return <Music className="h-4 w-4 text-green-400" />;
  if (fileType === 'video') return <Video className="h-4 w-4 text-red-500" />;
  if (file.type === '.rs')
    return <FileCode className="h-4 w-4 text-orange-400" />;
  if (file.type === '.html')
    return <FileCode className="h-4 w-4 text-red-400" />;
  if (file.type === '.css')
    return <FileCode className="h-4 w-4 text-blue-500" />;
  if (file.type === '.js')
    return <FileCode className="h-4 w-4 text-yellow-400" />;

  return <FileIcon className="h-4 w-4 text-gray-400" />;
};

interface FileTreeProps {
  ownable: Ownable;
  onSelectFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  activeFilePath: string | null;
}

const FileTree = ({
  ownable,
  onSelectFile,
  onDeleteFile,
  activeFilePath,
}: FileTreeProps) => {
  const [expandedFolders, setExpandedFolders] = useState<
    Record<string, boolean>
  >({
    '/': true, // Root folder is expanded by default
  });
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    filePath: string;
  } | null>(null);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const handleContextMenu = (e: React.MouseEvent, filePath: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      filePath,
    });
  };

  const handleClickOutside = () => {
    setContextMenu(null);
  };

  useEffect(() => {
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [contextMenu]);

  const renderFolder = (folder: FolderType, level = 0) => {
    const isExpanded = expandedFolders[folder.path] || false;
    const hasFiles = Object.keys(folder.files).length > 0;
    const hasFolders = Object.keys(folder.folders).length > 0;
    const hasContent = hasFiles || hasFolders;
    const paddingLeft = level * 12;

    return (
      <div key={folder.path}>
        {folder.path !== '/' && (
          <div
            className="flex items-center py-1 hover:bg-gray-800 cursor-pointer rounded px-2"
            style={{ paddingLeft: `${paddingLeft}px` }}
            onClick={() => toggleFolder(folder.path)}
          >
            {hasContent ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 mr-1 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1 text-gray-400" />
              )
            ) : (
              <span className="w-4 mr-1" />
            )}
            <Folder className="h-4 w-4 mr-2 text-yellow-400" />
            <span className="text-sm truncate">{folder.name}</span>
          </div>
        )}

        {isExpanded && (
          <div>
            {/* Render subfolders */}
            {Object.values(folder.folders).map((subfolder) =>
              renderFolder(subfolder, level + 1),
            )}

            {/* Render files */}
            {Object.values(folder.files).map((file) => (
              <div
                key={file.path}
                className={`flex items-center py-1 hover:bg-gray-800 cursor-pointer rounded px-2 ${
                  activeFilePath === file.path ? 'bg-gray-800' : ''
                }`}
                style={{ paddingLeft: `${(level + 1) * 12}px` }}
                onClick={() => onSelectFile(file.path)}
                onContextMenu={(e) => handleContextMenu(e, file.path)}
              >
                <span className="w-4 mr-1" />
                {getFileIcon(file)}
                <span className="ml-2 text-sm truncate">{file.name}</span>
                <button
                  className="ml-auto opacity-0 group-hover:opacity-100 hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      confirm(`Are you sure you want to delete ${file.name}?`)
                    ) {
                      onDeleteFile(file.path);
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="text-white overflow-auto">
      <div className="mb-2 flex items-center">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          {ownable.name}
        </h3>
      </div>
      {renderFolder(ownable.folder)}

      {/* Context Menu */}
      {contextMenu && contextMenu.visible && (
        <div
          className="fixed bg-gray-800 border border-gray-700 rounded shadow-lg z-50 py-1"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-700 flex items-center"
            onClick={() => {
              if (confirm(`Are you sure you want to delete this file?`)) {
                onDeleteFile(contextMenu.filePath);
                setContextMenu(null);
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2 text-red-500" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
};

// Sidebar toggle button
const SidebarToggleButton = ({
  isCollapsed,
  onClick,
}: {
  isCollapsed: boolean;
  onClick: () => void;
}) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={onClick}
    title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
    className={`${isCollapsed ? 'absolute left-0 top-3 z-10 bg-gray-800 hover:bg-gray-700' : ''}`}
  >
    {isCollapsed ? (
      <ChevronRight className="h-4 w-4" />
    ) : (
      <ChevronLeft className="h-4 w-4" />
    )}
  </Button>
);

export default function RwaStudioEditor() {
  const navigate = useNavigate();
  const { projectName } = useParams<{ projectName: string }>();
  const dispatch = useAppDispatch();
  const persistedActiveProject = useAppSelector((state) => state.activeProject);

  const {
    ownables,
    activeOwnable,
    isLoading,
    updateFile,
    addFile,
    deleteFile,
    setActiveOwnable,
    loadOwnables,
  } = useOwnableStore();
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [secondaryFilePath, setSecondaryFilePath] = useState<string | null>(
    null,
  );
  const [isSplitView, setIsSplitView] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileFolder, setNewFileFolder] = useState('/');
  const [newFileType, setNewFileType] =
    useState<keyof typeof FILE_TYPES>('.txt');
  const [newFileContent, setNewFileContent] = useState('');
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [splitRatio, setSplitRatio] = useState(0.5); // 50/50 split by default
  const splitResizingRef = useRef(false);
  const splitStartXRef = useRef(0);
  const splitStartRatioRef = useRef(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const previousSidebarWidthRef = useRef(250);
  const [activeSplitPane, setActiveSplitPane] = useState<
    'primary' | 'secondary'
  >('primary');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Editor settings
  const [editorTheme, setEditorTheme] = useState('vs-dark');
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [editorWordWrap, setEditorWordWrap] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [isBuildSandboxOpen, setIsBuildSandboxOpen] = useState(false);

  // Helper function to get a file by its path
  const getFileByPath = (path: string): File | null => {
    if (!activeOwnable || !ownables[activeOwnable]) return null;

    const ownable = ownables[activeOwnable];
    const pathParts = path.split('/').filter(Boolean);
    const fileName = pathParts.pop();
    let currentFolder = ownable.folder;

    // Navigate to the correct folder
    for (const part of pathParts) {
      if (!currentFolder.folders[part]) return null;
      currentFolder = currentFolder.folders[part];
    }

    // Return the file if it exists
    return fileName && currentFolder.files[fileName]
      ? currentFolder.files[fileName]
      : null;
  };

  // Load ownables when component mounts
  useEffect(() => {
    loadOwnables();
  }, [loadOwnables]);

  // Set active project from URL parameter or persisted state
  useEffect(() => {
    // If we have a project name in the URL, use that
    if (projectName) {
      setActiveOwnable(projectName);
      dispatch(setActiveProject(projectName));
    }
    // If no project name in URL but we have a persisted project, redirect to that project
    else if (persistedActiveProject && !activeOwnable) {
      navigate(`/studio/${encodeURIComponent(persistedActiveProject)}`);
    }
    // If no project name in URL and no persisted project, redirect to projects list
    else if (
      !projectName &&
      !persistedActiveProject &&
      !isLoading &&
      !activeOwnable
    ) {
      navigate('/projects');
    }
  }, [
    projectName,
    persistedActiveProject,
    activeOwnable,
    isLoading,
    navigate,
    setActiveOwnable,
    dispatch,
  ]);

  // Add file to recent files when selected
  useEffect(() => {
    if (activeFilePath && activeOwnable) {
      setRecentFiles((prev) => {
        // Remove if already exists
        const filtered = prev.filter((path) => path !== activeFilePath);
        // Add to the beginning
        const newRecentFiles = [activeFilePath, ...filtered].slice(
          0,
          MAX_RECENT_FILES,
        );
        // Save to localStorage
        localStorageService.saveRecentFiles(activeOwnable, newRecentFiles);
        localStorageService.saveActiveFile(activeOwnable, activeFilePath);
        return newRecentFiles;
      });
    }
  }, [activeFilePath, activeOwnable]);

  // Add secondary file to recent files when selected
  useEffect(() => {
    if (secondaryFilePath && activeOwnable) {
      setRecentFiles((prev) => {
        // Remove if already exists
        const filtered = prev.filter((path) => path !== secondaryFilePath);
        // Add to the beginning
        const newRecentFiles = [secondaryFilePath, ...filtered].slice(
          0,
          MAX_RECENT_FILES,
        );
        // Save to localStorage
        localStorageService.saveRecentFiles(activeOwnable, newRecentFiles);
        localStorageService.saveSecondaryFile(activeOwnable, secondaryFilePath);
        return newRecentFiles;
      });
    }
  }, [secondaryFilePath, activeOwnable]);

  // Save split view state when it changes
  useEffect(() => {
    if (activeOwnable) {
      localStorageService.saveSplitView(activeOwnable, isSplitView);
    }
  }, [isSplitView, activeOwnable]);

  // Save split ratio when it changes
  useEffect(() => {
    if (activeOwnable) {
      localStorageService.saveSplitRatio(activeOwnable, splitRatio);
    }
  }, [splitRatio, activeOwnable]);

  // Save active split pane when it changes
  useEffect(() => {
    if (activeOwnable) {
      localStorageService.saveActiveSplitPane(activeOwnable, activeSplitPane);
    }
  }, [activeSplitPane, activeOwnable]);

  // Save sidebar width when it changes
  useEffect(() => {
    if (activeOwnable) {
      localStorageService.saveSidebarWidth(activeOwnable, sidebarWidth);
    }
  }, [sidebarWidth, activeOwnable]);

  // Save sidebar collapsed state when it changes
  useEffect(() => {
    if (activeOwnable) {
      localStorageService.saveSidebarCollapsed(
        activeOwnable,
        isSidebarCollapsed,
      );
    }
  }, [isSidebarCollapsed, activeOwnable]);

  // Save editor settings to localStorage
  useEffect(() => {
    if (activeOwnable) {
      localStorage.setItem(`${activeOwnable}:editor-theme`, editorTheme);
      localStorage.setItem(
        `${activeOwnable}:editor-font-size`,
        editorFontSize.toString(),
      );
      localStorage.setItem(
        `${activeOwnable}:editor-word-wrap`,
        editorWordWrap.toString(),
      );
    }
  }, [editorTheme, editorFontSize, editorWordWrap, activeOwnable]);

  // Load editor settings from localStorage
  useEffect(() => {
    if (activeOwnable) {
      const theme = localStorage.getItem(`${activeOwnable}:editor-theme`);
      const fontSize = localStorage.getItem(
        `${activeOwnable}:editor-font-size`,
      );
      const wordWrap = localStorage.getItem(
        `${activeOwnable}:editor-word-wrap`,
      );

      if (theme) setEditorTheme(theme);
      if (fontSize) setEditorFontSize(parseInt(fontSize, 10));
      if (wordWrap) setEditorWordWrap(wordWrap === 'true');
    }
  }, [activeOwnable]);

  // Restore editor state when active ownable changes
  useEffect(() => {
    if (activeOwnable && ownables[activeOwnable]) {
      // Get editor state from localStorage
      const editorState = localStorageService.getEditorState(activeOwnable);

      // Validate file paths to ensure they still exist
      const validateFilePath = (path: string | null): string | null => {
        if (!path) return null;
        return getFileByPath(path) ? path : null;
      };

      // Set state with validated paths
      const validatedActiveFile = validateFilePath(editorState.activeFilePath);
      const validatedSecondaryFile = validateFilePath(
        editorState.secondaryFilePath,
      );

      // Filter recent files to only include files that still exist
      const validatedRecentFiles = editorState.recentFiles.filter((path) =>
        getFileByPath(path),
      );

      // Restore state
      setRecentFiles(validatedRecentFiles);
      setActiveFilePath(validatedActiveFile);
      setSecondaryFilePath(validatedSecondaryFile);
      setIsSplitView(
        editorState.isSplitView && validatedSecondaryFile !== null,
      );
      setSplitRatio(editorState.splitRatio);
      setActiveSplitPane(editorState.activeSplitPane);
      setSidebarWidth(editorState.sidebarWidth);
      setIsSidebarCollapsed(editorState.isSidebarCollapsed);
    }
  }, [activeOwnable, ownables]);

  // Check if tabs can be scrolled
  const checkTabsScroll = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth);
    }
  };

  // Add event listener to check scroll position
  useEffect(() => {
    const tabsContainer = tabsContainerRef.current;
    if (tabsContainer) {
      checkTabsScroll();
      tabsContainer.addEventListener('scroll', checkTabsScroll);
      window.addEventListener('resize', checkTabsScroll);
    }

    return () => {
      if (tabsContainer) {
        tabsContainer.removeEventListener('scroll', checkTabsScroll);
        window.removeEventListener('resize', checkTabsScroll);
      }
    };
  }, []);

  // Check scroll when recent files change
  useEffect(() => {
    checkTabsScroll();
  }, [recentFiles]);

  // Add effect to scroll to active tab when it changes
  useEffect(() => {
    if (activeFilePath) {
      // Find the active tab element
      const activeTab = document.querySelector(
        `[data-file-path="${activeFilePath}"]`,
      );
      if (activeTab && tabsContainerRef.current) {
        // Scroll the active tab into view with some padding
        const container = tabsContainerRef.current;
        const tabRect = activeTab.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Calculate if the tab is outside the visible area
        const isTabLeftOfView = tabRect.left < containerRect.left;
        const isTabRightOfView = tabRect.right > containerRect.right;

        if (isTabLeftOfView) {
          // Scroll so the tab is at the left with some padding
          container.scrollLeft += tabRect.left - containerRect.left - 20;
        } else if (isTabRightOfView) {
          // Scroll so the tab is at the right with some padding
          container.scrollLeft += tabRect.right - containerRect.right + 20;
        }
      }
    }
  }, [activeFilePath]);

  // Similar effect for secondary file path in split view
  useEffect(() => {
    if (secondaryFilePath && activeSplitPane === 'secondary') {
      const secondaryTab = document.querySelector(
        `[data-file-path="${secondaryFilePath}"]`,
      );
      if (secondaryTab && tabsContainerRef.current) {
        const container = tabsContainerRef.current;
        const tabRect = secondaryTab.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const isTabLeftOfView = tabRect.left < containerRect.left;
        const isTabRightOfView = tabRect.right > containerRect.right;

        if (isTabLeftOfView) {
          container.scrollLeft += tabRect.left - containerRect.left - 20;
        } else if (isTabRightOfView) {
          container.scrollLeft += tabRect.right - containerRect.right + 20;
        }
      }
    }
  }, [secondaryFilePath, activeSplitPane]);

  if (!activeOwnable || !ownables[activeOwnable]) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin" />
          <p>Loading project...</p>
        </div>
      </div>
    );
  }

  const ownable = ownables[activeOwnable];

  const activeFile = activeFilePath ? getFileByPath(activeFilePath) : null;
  const secondaryFile = secondaryFilePath
    ? getFileByPath(secondaryFilePath)
    : null;

  const handleFileSelect = (path: string) => {
    if (
      path === activeFilePath &&
      (!isSplitView || activeSplitPane === 'primary')
    )
      return;
    if (
      path === secondaryFilePath &&
      isSplitView &&
      activeSplitPane === 'secondary'
    )
      return;

    if (isSplitView) {
      if (activeSplitPane === 'primary') {
        setActiveFilePath(path);
      } else {
        setSecondaryFilePath(path);
      }
    } else {
      setActiveFilePath(path);
    }
  };

  const handleEditorChange = (path: string, content: string) => {
    if (!activeOwnable) return;
    updateFile(activeOwnable, path, content);
  };

  const toggleSplitView = () => {
    if (!isSplitView && activeFilePath) {
      // When enabling split view, set the secondary file to the active file
      setSecondaryFilePath(activeFilePath);
    }
    setIsSplitView(!isSplitView);
  };

  const startResize = (e: React.MouseEvent) => {
    resizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
  };

  const handleResize = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const newWidth = startWidthRef.current + (e.clientX - startXRef.current);
    if (newWidth > 150 && newWidth < 500) {
      setSidebarWidth(newWidth);
    }
  };

  const stopResize = () => {
    resizingRef.current = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  };

  const startSplitResize = (e: React.MouseEvent) => {
    splitResizingRef.current = true;
    splitStartXRef.current = e.clientX;
    splitStartRatioRef.current = splitRatio;
    document.addEventListener('mousemove', handleSplitResize);
    document.addEventListener('mouseup', stopSplitResize);
  };

  const handleSplitResize = (e: MouseEvent) => {
    if (!splitResizingRef.current) return;

    const containerWidth =
      document.getElementById('editor-container')?.clientWidth || 0;
    if (containerWidth === 0) return;

    const deltaX = e.clientX - splitStartXRef.current;
    const deltaRatio = deltaX / containerWidth;
    const newRatio = Math.min(
      Math.max(0.1, splitStartRatioRef.current + deltaRatio),
      0.9,
    );

    setSplitRatio(newRatio);
  };

  const stopSplitResize = () => {
    splitResizingRef.current = false;
    document.removeEventListener('mousemove', handleSplitResize);
    document.removeEventListener('mouseup', stopSplitResize);
  };

  const toggleSidebar = () => {
    if (isSidebarCollapsed) {
      setSidebarWidth(previousSidebarWidthRef.current);
    } else {
      previousSidebarWidthRef.current = sidebarWidth;
      setSidebarWidth(50); // Collapsed width - slightly wider to show icons
    }
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const isPreviewable = (file: File | null) => {
    if (!file) return false;
    const fileType = FILE_TYPES[file.type];
    return PREVIEW_SUPPORTED_TYPES.includes(
      fileType as (typeof PREVIEW_SUPPORTED_TYPES)[number],
    );
  };

  const renderEditor = (
    file: File | null,
    onChange: (content: string) => void,
  ) => {
    if (!file) {
      return (
        <div className="flex h-full items-center justify-center text-gray-500">
          <div className="text-center">
            <FolderOpen className="h-16 w-16 mx-auto mb-4" />
            <p>Select a file to start editing</p>
          </div>
        </div>
      );
    }

    if (isPreviewable(file)) {
      return (
        <div className="h-full flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center">
              {getFileIcon(file)}
              <span className="ml-2">{file.name}</span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <AssetPreview file={file} className="h-full" />
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center">
            {getFileIcon(file)}
            <span className="ml-2">{file.name}</span>
            <span className="ml-4 text-gray-400 text-sm">
              Last modified: {file.lastModified.toLocaleString()}
            </span>
          </div>
          <Button variant="ghost" size="sm">
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
        </div>
        <ControlledEditor
          height="calc(100% - 2rem)"
          language={FILE_TYPES[file.type]}
          value={file.content}
          onChange={(value) => onChange(value || '')}
          options={{
            theme: editorTheme,
            minimap: { enabled: true },
            fontSize: editorFontSize,
            wordWrap: editorWordWrap ? 'on' : 'off',
            automaticLayout: true,
          }}
        />
      </div>
    );
  };

  const handleCreateNewFile = async () => {
    if (!activeOwnable || !newFileName) return;

    // Construct the full path
    const path =
      newFileFolder === '/'
        ? `/${newFileName}`
        : `${newFileFolder}${newFileName}`;

    // Add the file
    await addFile(activeOwnable, path, newFileContent, newFileType);

    // Close the modal and reset form
    setIsNewFileModalOpen(false);
    setNewFileName('');
    setNewFileFolder('/');
    setNewFileContent('');

    // Select the new file
    setActiveFilePath(path);
  };

  const handleImportFile = async () => {
    if (!activeOwnable) return;

    try {
      // Open file picker with specific accept types for better user experience
      const [fileHandle] = await window.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: 'All Supported Files',
            accept: {
              'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
              'model/*': ['.gltf', '.glb', '.fbx', '.obj'],
              'audio/*': ['.mp3', '.wav', '.ogg', '.flac'],
              'video/*': ['.mp4', '.webm', '.mov', '.avi'],
              'text/*': [
                '.html',
                '.css',
                '.js',
                '.ts',
                '.json',
                '.md',
                '.txt',
                '.rs',
                '.toml',
              ],
            },
          },
        ],
      });

      const file = await fileHandle.getFile();
      const fileName = file.name;

      // Get file type
      const extension = '.' + fileName.split('.').pop()?.toLowerCase();
      const fileType = Object.keys(FILE_TYPES).find(
        (type) => type === extension,
      ) as keyof typeof FILE_TYPES;

      if (!fileType) {
        alert(`Unsupported file type: ${extension}`);
        return;
      }

      // Determine if this is a binary file type
      const isBinaryFile =
        fileType === '.fbx' ||
        fileType === '.glb' ||
        fileType === '.obj' ||
        fileType === '.png' ||
        fileType === '.jpg' ||
        fileType === '.jpeg' ||
        fileType === '.gif' ||
        fileType === '.webp' ||
        FILE_TYPES[fileType] === 'audio' ||
        FILE_TYPES[fileType] === 'video';

      let content;
      if (isBinaryFile) {
        try {
          // For all image files, use FileReader to get a data URL directly
          if (FILE_TYPES[fileType] === 'image') {
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = async (e) => {
                const dataUrl = e.target?.result as string;

                // Add the file to the root folder
                const path = `/${fileName}`;
                await addFile(activeOwnable, path, dataUrl, fileType);

                // Select the new file
                setActiveFilePath(path);
                resolve(undefined);
              };
              reader.readAsDataURL(file);
            });
          }
          // For 3D models, especially FBX, handle differently
          else if (fileType === '.fbx') {
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = async (e) => {
                const arrayBuffer = e.target?.result as ArrayBuffer;

                // Convert ArrayBuffer to base64
                const binary = new Uint8Array(arrayBuffer);
                let binaryString = '';
                for (let i = 0; i < binary.byteLength; i++) {
                  binaryString += String.fromCharCode(binary[i]);
                }
                const base64 = btoa(binaryString);

                // Add the file to the root folder with base64 content
                const path = `/${fileName}`;
                await addFile(activeOwnable, path, base64, fileType);

                // Select the new file
                setActiveFilePath(path);
                resolve(undefined);
              };
              reader.readAsArrayBuffer(file);
            });
          }
          // For other binary files
          else {
            // Read as ArrayBuffer for binary files
            const arrayBuffer = await file.arrayBuffer();

            // Convert to base64
            const binary = new Uint8Array(arrayBuffer);
            let binaryString = '';
            for (let i = 0; i < binary.byteLength; i++) {
              binaryString += String.fromCharCode(binary[i]);
            }
            content = btoa(binaryString);
          }
        } catch (error) {
          console.error('Error reading binary file:', error);
          alert('Failed to read binary file. See console for details.');
          return;
        }
      } else {
        // Read as text for text files
        content = await file.text();
      }

      // Add the file to the root folder (if not already handled as image or FBX)
      if (content) {
        const path = `/${fileName}`;
        await addFile(activeOwnable, path, content, fileType);

        // Select the new file
        setActiveFilePath(path);
      }
    } catch (error) {
      // Handle user cancellation
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      console.error('Error importing file:', error);
      alert('Failed to import file. See console for details.');
    }
  };

  const handleDeleteFile = async (path: string) => {
    if (!activeOwnable) return;

    // Delete the file
    await deleteFile(activeOwnable, path);

    // If the deleted file was active, clear the active file
    if (path === activeFilePath) {
      setActiveFilePath(null);
      localStorageService.saveActiveFile(activeOwnable, null);
    }

    // If the deleted file was secondary, clear the secondary file
    if (path === secondaryFilePath) {
      setSecondaryFilePath(null);
      localStorageService.saveSecondaryFile(activeOwnable, null);
    }

    // Remove from recent files
    setRecentFiles((prev) => {
      const newRecentFiles = prev.filter((p) => p !== path);
      localStorageService.saveRecentFiles(activeOwnable, newRecentFiles);
      return newRecentFiles;
    });
  };

  // When user navigates away or closes the project
  const handleCloseProject = () => {
    // We don't clear localStorage when closing a project
    // as we want to restore the state when the user returns
    dispatch(setActiveProject(null));
    setActiveOwnable(null);
    navigate('/projects');
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div
        className="h-full border-r border-gray-700 overflow-hidden flex flex-col transition-all duration-300"
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="p-3 border-b border-gray-700 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCloseProject}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <Home className="h-4 w-4" />
          </Button>
          {!isSidebarCollapsed && (
            <h2 className="text-sm font-bold">Explorer</h2>
          )}
          <div className="flex">
            {!isSidebarCollapsed && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsNewFileModalOpen(true)}
                  title="New File"
                >
                  <FilePlus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleImportFile}
                  title="Import File"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </>
            )}
            <SidebarToggleButton
              isCollapsed={isSidebarCollapsed}
              onClick={toggleSidebar}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-2">
          {isSidebarCollapsed ? (
            // Collapsed sidebar view - show only icons
            <div className="text-white overflow-auto">
              {Object.values(ownable.folder.files).map((file) => (
                <div
                  key={file.path}
                  className={`flex justify-center items-center py-2 hover:bg-gray-800 cursor-pointer rounded ${
                    activeFilePath === file.path ||
                    secondaryFilePath === file.path
                      ? 'bg-gray-800'
                      : ''
                  }`}
                  onClick={() => handleFileSelect(file.path)}
                  title={file.name}
                >
                  {getFileIcon(file)}
                </div>
              ))}
              {Object.values(ownable.folder.folders).map((folder) => (
                <div
                  key={folder.path}
                  className="flex justify-center items-center py-2 hover:bg-gray-800 cursor-pointer rounded"
                  title={folder.name}
                >
                  <Folder className="h-4 w-4 text-yellow-400" />
                </div>
              ))}
            </div>
          ) : (
            // Expanded sidebar view - show full file tree
            <FileTree
              ownable={ownable}
              onSelectFile={handleFileSelect}
              onDeleteFile={handleDeleteFile}
              activeFilePath={activeFilePath}
            />
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div
        className="w-1 h-full cursor-col-resize bg-gray-700 hover:bg-blue-500"
        onMouseDown={startResize}
      />

      {/* Editor area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Studio Toolbar */}
        <div className="p-2 border-b border-gray-700 bg-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-semibold">{ownable.name}</span>
          </div>
          <div className="flex items-center space-x-2">
            {/* Split View Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSplitView}
              className="flex items-center"
              title={isSplitView ? 'Single View' : 'Split View'}
            >
              {isSplitView ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <SplitSquareVertical className="h-4 w-4" />
              )}
            </Button>

            {/* Settings Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center"
                title="Settings"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              {isSettingsOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-gray-800 border border-gray-700 rounded shadow-lg z-50">
                  <div className="p-2 border-b border-gray-700 flex justify-between items-center">
                    <span className="text-sm font-semibold">
                      Editor Settings
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => setIsSettingsOpen(false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="p-2">
                    <label className="block text-sm mb-1">Monaco Theme</label>
                    <select
                      className="w-full p-1 bg-gray-700 rounded border border-gray-600 text-white text-sm"
                      onChange={(e) => {
                        setEditorTheme(e.target.value);
                      }}
                      value={editorTheme}
                    >
                      <option value="vs-dark">Dark (Default)</option>
                      <option value="vs">Light</option>
                      <option value="hc-black">High Contrast Dark</option>
                      <option value="hc-light">High Contrast Light</option>
                    </select>
                  </div>
                  <div className="p-2">
                    <label className="block text-sm mb-1">Font Size</label>
                    <select
                      className="w-full p-1 bg-gray-700 rounded border border-gray-600 text-white text-sm"
                      onChange={(e) => {
                        setEditorFontSize(parseInt(e.target.value, 10));
                      }}
                      value={editorFontSize.toString()}
                    >
                      <option value="12">12px</option>
                      <option value="14">14px (Default)</option>
                      <option value="16">16px</option>
                      <option value="18">18px</option>
                      <option value="20">20px</option>
                    </select>
                  </div>
                  <div className="p-2">
                    <label className="block text-sm mb-1">Word Wrap</label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="word-wrap"
                        className="mr-2"
                        checked={editorWordWrap}
                        onChange={(e) => {
                          setEditorWordWrap(e.target.checked);
                        }}
                      />
                      <label htmlFor="word-wrap" className="text-sm">
                        Enable word wrap
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Build Button */}
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center"
              title="Build Project"
              onClick={() => {
                if (!activeOwnable || !ownables[activeOwnable]) {
                  alert('No active project');
                  return;
                }

                // Open the build sandbox
                setIsBuildSandboxOpen(true);
              }}
            >
              <Package className="h-4 w-4" />
            </Button>

            {/* Import Button */}
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center"
              title="Import Ownable"
              onClick={() => {
                // Placeholder for import functionality
                const importOwnable = async () => {
                  try {
                    // In a real implementation, this would:
                    // 1. Open a file picker for the ownable file
                    // 2. Parse and validate the file
                    // 3. Import it into the current project or create a new one

                    alert(
                      'This feature will allow importing ownables from external sources.',
                    );

                    // Simulate file selection
                    const fileSelected = window.confirm(
                      'Would you like to select a file to import?',
                    );

                    if (fileSelected) {
                      // Simulate processing
                      await new Promise((resolve) => setTimeout(resolve, 1000));
                      alert(
                        'Import functionality will be implemented in a future update.',
                      );
                    }
                  } catch (error) {
                    console.error('Error importing ownable:', error);
                    alert('Failed to import ownable. See console for details.');
                  }
                };

                importOwnable();
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* File tabs with horizontal scrolling */}
        <div className="relative flex border-b border-gray-700 bg-gray-800 h-8">
          {/* Left scroll button - only show when needed */}
          {canScrollLeft && (
            <button
              className="sticky left-0 z-10 w-6 bg-gray-800 hover:bg-gray-700 flex items-center justify-center border-r border-gray-700 flex-shrink-0"
              onClick={() => {
                if (tabsContainerRef.current) {
                  tabsContainerRef.current.scrollBy({
                    left: -200,
                    behavior: 'smooth',
                  });
                }
              }}
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
          )}

          {/* Scrollable tabs container */}
          <div
            ref={tabsContainerRef}
            className="flex-1 overflow-x-auto scrollbar-none"
            onScroll={checkTabsScroll}
          >
            <div className="flex min-w-max">
              {recentFiles.map((filePath) => {
                const file = getFileByPath(filePath);
                if (!file) return null;

                const isActive = filePath === activeFilePath;
                const isSecondary = filePath === secondaryFilePath;

                return (
                  <div
                    key={filePath}
                    data-file-path={filePath}
                    className={`flex items-center py-0.5 px-2 border-r border-gray-700 cursor-pointer whitespace-nowrap ${
                      isActive || isSecondary
                        ? 'bg-gray-700'
                        : 'hover:bg-gray-700'
                    }`}
                    onClick={() => handleFileSelect(filePath)}
                  >
                    {getFileIcon(file)}
                    <span className="ml-1 text-sm truncate max-w-[120px]">
                      {file.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 p-0 h-4 w-4 hover:bg-gray-600 rounded-full flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Remove from recent files
                        setRecentFiles((prev) =>
                          prev.filter((p) => p !== filePath),
                        );
                        // If it's active or secondary, clear that state
                        if (isActive) setActiveFilePath(null);
                        if (isSecondary) setSecondaryFilePath(null);
                      }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right scroll button - only show when needed */}
          {canScrollRight && (
            <button
              className="sticky right-0 z-10 w-6 bg-gray-800 hover:bg-gray-700 flex items-center justify-center border-l border-gray-700 flex-shrink-0"
              onClick={() => {
                if (tabsContainerRef.current) {
                  tabsContainerRef.current.scrollBy({
                    left: 200,
                    behavior: 'smooth',
                  });
                }
              }}
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Editor content */}
        <div id="editor-container" className="flex-1 overflow-hidden flex">
          {isSplitView ? (
            <>
              <div
                className={`overflow-hidden p-3 ${activeSplitPane === 'primary' ? 'ring-1 ring-blue-500' : ''}`}
                style={{ flex: splitRatio }}
                onClick={() => setActiveSplitPane('primary')}
              >
                {renderEditor(
                  activeFile,
                  (content) =>
                    activeFilePath &&
                    handleEditorChange(activeFilePath, content),
                )}
              </div>
              <div
                className="w-1 h-full cursor-col-resize bg-gray-700 hover:bg-blue-500 z-10"
                onMouseDown={startSplitResize}
              />
              <div
                className={`overflow-hidden p-3 ${activeSplitPane === 'secondary' ? 'ring-1 ring-blue-500' : ''}`}
                style={{ flex: 1 - splitRatio }}
                onClick={() => setActiveSplitPane('secondary')}
              >
                {renderEditor(
                  secondaryFile,
                  (content) =>
                    secondaryFilePath &&
                    handleEditorChange(secondaryFilePath, content),
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 p-3 overflow-hidden">
              {renderEditor(
                activeFile,
                (content) =>
                  activeFilePath && handleEditorChange(activeFilePath, content),
              )}
            </div>
          )}
        </div>
      </div>

      {/* New File Modal */}
      {isNewFileModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Create New File</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                File Name
              </label>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white"
                placeholder="example.txt"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                File Type
              </label>
              <select
                value={newFileType}
                onChange={(e) =>
                  setNewFileType(e.target.value as keyof typeof FILE_TYPES)
                }
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white"
              >
                {Object.keys(FILE_TYPES).map((type) => (
                  <option key={type} value={type}>
                    {type} ({FILE_TYPES[type as keyof typeof FILE_TYPES]})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Folder</label>
              <input
                type="text"
                value={newFileFolder}
                onChange={(e) => setNewFileFolder(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white"
                placeholder="/"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Initial Content
              </label>
              <textarea
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white h-32"
                placeholder="Enter file content here..."
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsNewFileModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateNewFile}>Create File</Button>
            </div>
          </div>
        </div>
      )}

      {/* Build Sandbox */}
      {isBuildSandboxOpen && activeOwnable && ownables[activeOwnable] && (
        <BuildSandbox
          ownable={ownables[activeOwnable]}
          isOpen={isBuildSandboxOpen}
          onClose={() => setIsBuildSandboxOpen(false)}
        />
      )}
    </div>
  );
}
