/**
 * LocalStorage service for persisting editor state
 */

// Keys for localStorage
const KEYS = {
  RECENT_FILES: 'rwa-studio:recent-files',
  ACTIVE_FILE: 'rwa-studio:active-file',
  SECONDARY_FILE: 'rwa-studio:secondary-file',
  IS_SPLIT_VIEW: 'rwa-studio:is-split-view',
  SPLIT_RATIO: 'rwa-studio:split-ratio',
  ACTIVE_SPLIT_PANE: 'rwa-studio:active-split-pane',
  SIDEBAR_WIDTH: 'rwa-studio:sidebar-width',
  IS_SIDEBAR_COLLAPSED: 'rwa-studio:is-sidebar-collapsed',
};

// Prefix all keys with the project name to avoid conflicts
const getProjectKey = (projectName: string, key: string) =>
  `${projectName}:${key}`;

class LocalStorageService {
  /**
   * Save recent files for a project
   */
  saveRecentFiles(projectName: string, files: string[]): void {
    try {
      localStorage.setItem(
        getProjectKey(projectName, KEYS.RECENT_FILES),
        JSON.stringify(files),
      );
    } catch (error) {
      console.error('Error saving recent files to localStorage:', error);
    }
  }

  /**
   * Get recent files for a project
   */
  getRecentFiles(projectName: string): string[] {
    try {
      const files = localStorage.getItem(
        getProjectKey(projectName, KEYS.RECENT_FILES),
      );
      return files ? JSON.parse(files) : [];
    } catch (error) {
      console.error('Error getting recent files from localStorage:', error);
      return [];
    }
  }

  /**
   * Save active file path
   */
  saveActiveFile(projectName: string, filePath: string | null): void {
    try {
      if (filePath) {
        localStorage.setItem(
          getProjectKey(projectName, KEYS.ACTIVE_FILE),
          filePath,
        );
      } else {
        localStorage.removeItem(getProjectKey(projectName, KEYS.ACTIVE_FILE));
      }
    } catch (error) {
      console.error('Error saving active file to localStorage:', error);
    }
  }

  /**
   * Get active file path
   */
  getActiveFile(projectName: string): string | null {
    try {
      return localStorage.getItem(getProjectKey(projectName, KEYS.ACTIVE_FILE));
    } catch (error) {
      console.error('Error getting active file from localStorage:', error);
      return null;
    }
  }

  /**
   * Save secondary file path
   */
  saveSecondaryFile(projectName: string, filePath: string | null): void {
    try {
      if (filePath) {
        localStorage.setItem(
          getProjectKey(projectName, KEYS.SECONDARY_FILE),
          filePath,
        );
      } else {
        localStorage.removeItem(
          getProjectKey(projectName, KEYS.SECONDARY_FILE),
        );
      }
    } catch (error) {
      console.error('Error saving secondary file to localStorage:', error);
    }
  }

  /**
   * Get secondary file path
   */
  getSecondaryFile(projectName: string): string | null {
    try {
      return localStorage.getItem(
        getProjectKey(projectName, KEYS.SECONDARY_FILE),
      );
    } catch (error) {
      console.error('Error getting secondary file from localStorage:', error);
      return null;
    }
  }

  /**
   * Save split view state
   */
  saveSplitView(projectName: string, isSplitView: boolean): void {
    try {
      localStorage.setItem(
        getProjectKey(projectName, KEYS.IS_SPLIT_VIEW),
        String(isSplitView),
      );
    } catch (error) {
      console.error('Error saving split view state to localStorage:', error);
    }
  }

  /**
   * Get split view state
   */
  getSplitView(projectName: string): boolean {
    try {
      const value = localStorage.getItem(
        getProjectKey(projectName, KEYS.IS_SPLIT_VIEW),
      );
      return value === 'true';
    } catch (error) {
      console.error('Error getting split view state from localStorage:', error);
      return false;
    }
  }

  /**
   * Save split ratio
   */
  saveSplitRatio(projectName: string, ratio: number): void {
    try {
      localStorage.setItem(
        getProjectKey(projectName, KEYS.SPLIT_RATIO),
        String(ratio),
      );
    } catch (error) {
      console.error('Error saving split ratio to localStorage:', error);
    }
  }

  /**
   * Get split ratio
   */
  getSplitRatio(projectName: string): number {
    try {
      const value = localStorage.getItem(
        getProjectKey(projectName, KEYS.SPLIT_RATIO),
      );
      return value ? parseFloat(value) : 0.5;
    } catch (error) {
      console.error('Error getting split ratio from localStorage:', error);
      return 0.5;
    }
  }

  /**
   * Save active split pane
   */
  saveActiveSplitPane(
    projectName: string,
    pane: 'primary' | 'secondary',
  ): void {
    try {
      localStorage.setItem(
        getProjectKey(projectName, KEYS.ACTIVE_SPLIT_PANE),
        pane,
      );
    } catch (error) {
      console.error('Error saving active split pane to localStorage:', error);
    }
  }

  /**
   * Get active split pane
   */
  getActiveSplitPane(projectName: string): 'primary' | 'secondary' {
    try {
      const value = localStorage.getItem(
        getProjectKey(projectName, KEYS.ACTIVE_SPLIT_PANE),
      );
      return (value as 'primary' | 'secondary') || 'primary';
    } catch (error) {
      console.error(
        'Error getting active split pane from localStorage:',
        error,
      );
      return 'primary';
    }
  }

  /**
   * Save sidebar width
   */
  saveSidebarWidth(projectName: string, width: number): void {
    try {
      localStorage.setItem(
        getProjectKey(projectName, KEYS.SIDEBAR_WIDTH),
        String(width),
      );
    } catch (error) {
      console.error('Error saving sidebar width to localStorage:', error);
    }
  }

  /**
   * Get sidebar width
   */
  getSidebarWidth(projectName: string): number {
    try {
      const value = localStorage.getItem(
        getProjectKey(projectName, KEYS.SIDEBAR_WIDTH),
      );
      return value ? parseInt(value, 10) : 250;
    } catch (error) {
      console.error('Error getting sidebar width from localStorage:', error);
      return 250;
    }
  }

  /**
   * Save sidebar collapsed state
   */
  saveSidebarCollapsed(projectName: string, isCollapsed: boolean): void {
    try {
      localStorage.setItem(
        getProjectKey(projectName, KEYS.IS_SIDEBAR_COLLAPSED),
        String(isCollapsed),
      );
    } catch (error) {
      console.error(
        'Error saving sidebar collapsed state to localStorage:',
        error,
      );
    }
  }

  /**
   * Get sidebar collapsed state
   */
  getSidebarCollapsed(projectName: string): boolean {
    try {
      const value = localStorage.getItem(
        getProjectKey(projectName, KEYS.IS_SIDEBAR_COLLAPSED),
      );
      return value === 'true';
    } catch (error) {
      console.error(
        'Error getting sidebar collapsed state from localStorage:',
        error,
      );
      return false;
    }
  }

  /**
   * Save entire editor state at once
   */
  saveEditorState(
    projectName: string,
    state: {
      recentFiles: string[];
      activeFilePath: string | null;
      secondaryFilePath: string | null;
      isSplitView: boolean;
      splitRatio: number;
      activeSplitPane: 'primary' | 'secondary';
      sidebarWidth: number;
      isSidebarCollapsed: boolean;
    },
  ): void {
    this.saveRecentFiles(projectName, state.recentFiles);
    this.saveActiveFile(projectName, state.activeFilePath);
    this.saveSecondaryFile(projectName, state.secondaryFilePath);
    this.saveSplitView(projectName, state.isSplitView);
    this.saveSplitRatio(projectName, state.splitRatio);
    this.saveActiveSplitPane(projectName, state.activeSplitPane);
    this.saveSidebarWidth(projectName, state.sidebarWidth);
    this.saveSidebarCollapsed(projectName, state.isSidebarCollapsed);
  }

  /**
   * Get entire editor state at once
   */
  getEditorState(projectName: string): {
    recentFiles: string[];
    activeFilePath: string | null;
    secondaryFilePath: string | null;
    isSplitView: boolean;
    splitRatio: number;
    activeSplitPane: 'primary' | 'secondary';
    sidebarWidth: number;
    isSidebarCollapsed: boolean;
  } {
    return {
      recentFiles: this.getRecentFiles(projectName),
      activeFilePath: this.getActiveFile(projectName),
      secondaryFilePath: this.getSecondaryFile(projectName),
      isSplitView: this.getSplitView(projectName),
      splitRatio: this.getSplitRatio(projectName),
      activeSplitPane: this.getActiveSplitPane(projectName),
      sidebarWidth: this.getSidebarWidth(projectName),
      isSidebarCollapsed: this.getSidebarCollapsed(projectName),
    };
  }

  /**
   * Clear all editor state for a project
   */
  clearEditorState(projectName: string): void {
    try {
      localStorage.removeItem(getProjectKey(projectName, KEYS.RECENT_FILES));
      localStorage.removeItem(getProjectKey(projectName, KEYS.ACTIVE_FILE));
      localStorage.removeItem(getProjectKey(projectName, KEYS.SECONDARY_FILE));
      localStorage.removeItem(getProjectKey(projectName, KEYS.IS_SPLIT_VIEW));
      localStorage.removeItem(getProjectKey(projectName, KEYS.SPLIT_RATIO));
      localStorage.removeItem(
        getProjectKey(projectName, KEYS.ACTIVE_SPLIT_PANE),
      );
      localStorage.removeItem(getProjectKey(projectName, KEYS.SIDEBAR_WIDTH));
      localStorage.removeItem(
        getProjectKey(projectName, KEYS.IS_SIDEBAR_COLLAPSED),
      );
    } catch (error) {
      console.error('Error clearing editor state from localStorage:', error);
    }
  }
}

export const localStorageService = new LocalStorageService();
export default localStorageService;
