import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ownable } from '@/common/interfaces/files';
import buildService, { BuildConfig } from '@/common/services/buildService';
import { cleanupFolders } from '@/common/utils/cleanupUtils';
import {
  X,
  Download,
  Cpu,
  FileJson,
  Package,
  FileArchive,
  CheckCircle2,
} from 'lucide-react';

interface BuildSandboxProps {
  ownable: Ownable;
  isOpen: boolean;
  onClose: () => void;
}

export default function BuildSandbox({
  ownable,
  isOpen,
  onClose,
}: BuildSandboxProps) {
  const [buildStatus, setBuildStatus] = useState<
    'idle' | 'building' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [buildLog, setBuildLog] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('0.1.0');
  const [buildSteps, setBuildSteps] = useState<
    {
      step: string;
      status: 'pending' | 'in-progress' | 'completed' | 'error';
      details?: string;
    }[]
  >([
    { step: 'Collect project files', status: 'pending' },
    { step: 'Compile Rust to WebAssembly', status: 'pending' },
    { step: 'Generate JSON schemas', status: 'pending' },
    { step: 'Create package structure', status: 'pending' },
    { step: 'Generate final package', status: 'pending' },
  ]);
  const [packageCid, setPackageCid] = useState<string>('');

  // Add a log entry with timestamp
  const addLogEntry = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setBuildLog((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Update a build step status
  const updateBuildStep = (
    stepIndex: number,
    status: 'pending' | 'in-progress' | 'completed' | 'error',
    details?: string,
  ) => {
    setBuildSteps((prev) => {
      const newSteps = [...prev];
      if (stepIndex >= 0 && stepIndex < newSteps.length) {
        newSteps[stepIndex] = {
          ...newSteps[stepIndex],
          status,
          details,
        };
      }
      return newSteps;
    });
  };

  // Reset build steps to initial state
  const resetBuildSteps = () => {
    setBuildSteps([
      { step: 'Collect project files', status: 'pending' },
      { step: 'Compile Rust to WebAssembly', status: 'pending' },
      { step: 'Generate JSON schemas', status: 'pending' },
      { step: 'Create package structure', status: 'pending' },
      { step: 'Generate final package', status: 'pending' },
    ]);
  };

  // Generate a random CID for simulation purposes
  const generateRandomCid = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'bafybeie';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Run the cleanup script to remove temporary folders
  const runCleanup = () => {
    addLogEntry(
      'Running cleanup to remove temporary folders (pkg, schema, target)',
    );

    try {
      // Use the cleanupFolders utility function
      cleanupFolders(['pkg', 'schema', 'target']);

      // Log the cleanup action
      addLogEntry('Cleanup initiated - temporary folders will be removed');
    } catch (error) {
      console.error('Error during cleanup:', error);
      addLogEntry(
        `Cleanup error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  // Listen for the ownable-build-complete event
  useEffect(() => {
    const handleBuildComplete = (event: CustomEvent) => {
      if (event.detail?.action === 'cleanup') {
        runCleanup();
      }
    };

    // Add event listener
    window.addEventListener(
      'ownable-build-complete',
      handleBuildComplete as EventListener,
    );

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener(
        'ownable-build-complete',
        handleBuildComplete as EventListener,
      );
    };
  }, [runCleanup]);

  const handleBuild = async () => {
    try {
      setBuildStatus('building');
      setBuildLog([]);
      setErrorMessage('');
      resetBuildSteps();
      setPackageCid('');

      // Validate ownable structure
      if (!ownable || !ownable.folder || !ownable.folder.files) {
        const errorMsg = 'Invalid ownable structure. Missing folder or files.';
        setBuildStatus('error');
        setErrorMessage(errorMsg);
        addLogEntry(`Build failed: ${errorMsg}`);
        return;
      }

      // Run cleanup before starting the build
      runCleanup();

      // Log the build start
      addLogEntry(
        `Starting build for ${ownable.name} using browser-based WebAssembly compilation`,
      );

      // Create a custom build config with the selected version
      const buildConfig: BuildConfig = {
        packageName: `ownable-${ownable.name.toLowerCase().replace(/\s+/g, '-')}`,
        version: selectedVersion,
        description:
          ownable.description || `Ownable package for ${ownable.name}`,
      };

      // Override the console.log to capture build logs
      const originalConsoleLog = console.log;
      console.log = (...args) => {
        addLogEntry(args.join(' '));
        originalConsoleLog(...args);
      };

      // Check if buildService is properly initialized
      if (
        !buildService ||
        typeof buildService.setStepUpdateCallback !== 'function'
      ) {
        throw new Error(
          'Build service is not properly initialized. This may be due to a failed webpack build.',
        );
      }

      // Set up callbacks to receive build progress updates
      buildService.setStepUpdateCallback((steps) => {
        // Map build service steps to our UI steps
        if (!steps || !Array.isArray(steps)) {
          console.error('Steps array is undefined or not an array');
          return;
        }

        steps.forEach((step) => {
          if (step.id === 'collect') {
            updateBuildStep(
              0,
              step.status === 'running'
                ? 'in-progress'
                : step.status === 'success'
                  ? 'completed'
                  : step.status === 'error'
                    ? 'error'
                    : 'pending',
              step.message,
            );
          } else if (step.id === 'compile') {
            updateBuildStep(
              1,
              step.status === 'running'
                ? 'in-progress'
                : step.status === 'success'
                  ? 'completed'
                  : step.status === 'error'
                    ? 'error'
                    : 'pending',
              step.message,
            );
          } else if (step.id === 'schema') {
            updateBuildStep(
              2,
              step.status === 'running'
                ? 'in-progress'
                : step.status === 'success'
                  ? 'completed'
                  : step.status === 'error'
                    ? 'error'
                    : 'pending',
              step.message,
            );
          } else if (step.id === 'ts') {
            // This maps to our "Create package structure" step
            updateBuildStep(
              3,
              step.status === 'running'
                ? 'in-progress'
                : step.status === 'success'
                  ? 'completed'
                  : step.status === 'error'
                    ? 'error'
                    : 'pending',
              step.message,
            );
          } else if (step.id === 'package') {
            updateBuildStep(
              4,
              step.status === 'running'
                ? 'in-progress'
                : step.status === 'success'
                  ? 'completed'
                  : step.status === 'error'
                    ? 'error'
                    : 'pending',
              step.message,
            );
          }
        });
      });

      buildService.setLogUpdateCallback((logs) => {
        // Add new logs to our UI
        if (!logs || !Array.isArray(logs)) {
          console.error('Logs array is undefined or not an array');
          return;
        }

        logs.forEach((log) => {
          addLogEntry(`[${log.level.toUpperCase()}] ${log.message}`);
        });
      });

      // Build the ownable using the build service with custom config
      // The buildService now extracts the files from the ownable object
      await buildService.buildOwnable(
        { rustFiles: [], assetFiles: [], configFiles: [] },
        ownable,
        buildConfig,
      );

      // Generate a random CID for the package
      const cid = generateRandomCid();
      setPackageCid(cid);
      addLogEntry(`Package CID: ${cid}`);

      // Restore console.log
      console.log = originalConsoleLog;

      // Set success status
      setBuildStatus('success');
      addLogEntry('Build completed successfully!');

      // Run cleanup after the build is complete
      runCleanup();
    } catch (error) {
      console.error('Build error:', error);
      setBuildStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(errorMsg);
      addLogEntry(`Build failed: ${errorMsg}`);

      // Mark current step as error
      const currentStep =
        buildSteps && Array.isArray(buildSteps)
          ? buildSteps.findIndex((step) => step.status === 'in-progress')
          : -1;
      if (currentStep !== -1) {
        updateBuildStep(currentStep, 'error', errorMsg);
      }

      // Run cleanup even if the build fails
      runCleanup();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-3/4 max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Build Ownable: {ownable.name}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs
          defaultValue="build"
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="build">Build</TabsTrigger>
            <TabsTrigger value="process">Build Process</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="build" className="flex-1 overflow-auto">
            <div className="space-y-4">
              <div className="bg-gray-900 p-4 rounded-md">
                <h3 className="text-lg font-medium mb-2">Build Information</h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-300">
                    This will compile your Rust code to WebAssembly and package
                    it as an ownable. The compilation happens directly in your
                    browser using WebAssembly.
                  </p>
                  <div className="flex items-center space-x-2 mt-4">
                    <Cpu className="h-5 w-5 text-blue-400" />
                    <span className="text-blue-400 font-medium">
                      Browser-based WebAssembly Compilation
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 ml-7">
                    Your code is compiled locally in your browser - no server
                    required.
                  </p>
                </div>
              </div>

              <div className="bg-gray-900 p-4 rounded-md">
                <h3 className="text-lg font-medium mb-2">Version Selection</h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-300 mb-2">
                    Select the version for your ownable package:
                  </p>
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedVersion}
                      onChange={(e) => setSelectedVersion(e.target.value)}
                      className="bg-gray-700 text-white p-2 rounded-md"
                      disabled={buildStatus === 'building'}
                    >
                      <option value="0.1.0">0.1.0 - Basic Ownable</option>
                      <option value="0.2.0">0.2.0 - Standard Ownable</option>
                      <option value="0.3.0">0.3.0 - Advanced Ownable</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 p-4 rounded-md">
                <h3 className="text-lg font-medium mb-2">Build Status</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        buildStatus === 'idle'
                          ? 'bg-gray-500'
                          : buildStatus === 'building'
                            ? 'bg-yellow-500'
                            : buildStatus === 'success'
                              ? 'bg-green-500'
                              : 'bg-red-500'
                      }`}
                    />
                    <span>
                      {buildStatus === 'idle'
                        ? 'Ready to build'
                        : buildStatus === 'building'
                          ? 'Building...'
                          : buildStatus === 'success'
                            ? 'Build successful'
                            : 'Build failed'}
                    </span>
                  </div>

                  {buildStatus === 'error' && (
                    <div className="text-red-400 text-sm mt-2">
                      Error: {errorMessage}
                    </div>
                  )}

                  {buildStatus === 'success' && packageCid && (
                    <div className="text-green-400 text-sm mt-2">
                      Package CID: {packageCid}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleBuild}
                  disabled={buildStatus === 'building'}
                >
                  {buildStatus === 'building' ? (
                    <>Building...</>
                  ) : (
                    <>
                      <Package className="h-4 w-4 mr-2" />
                      Build Ownable
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="process" className="flex-1 overflow-auto">
            <div className="space-y-4">
              <div className="bg-gray-900 p-4 rounded-md">
                <h3 className="text-lg font-medium mb-2">Build Steps</h3>
                <div className="space-y-4">
                  {buildSteps.map((step, index) => (
                    <div key={index} className="flex items-start">
                      <div className="mt-0.5 mr-3">
                        {step.status === 'pending' ? (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-500" />
                        ) : step.status === 'in-progress' ? (
                          <div className="h-5 w-5 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />
                        ) : step.status === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <X className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div
                          className={`font-medium ${
                            step.status === 'pending'
                              ? 'text-gray-400'
                              : step.status === 'in-progress'
                                ? 'text-yellow-400'
                                : step.status === 'completed'
                                  ? 'text-green-400'
                                  : 'text-red-400'
                          }`}
                        >
                          {step.step}
                        </div>
                        {step.details && (
                          <div className="text-sm text-gray-400 mt-1">
                            {step.details}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {buildStatus === 'success' && (
                <div className="bg-gray-900 p-4 rounded-md">
                  <h3 className="text-lg font-medium mb-2">
                    Package Structure
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <FileArchive className="h-4 w-4 mr-2 text-yellow-400" />
                      <span className="font-mono">
                        ownable-
                        {ownable.name.toLowerCase().replace(/\s+/g, '-')}-
                        {selectedVersion}.zip
                      </span>
                    </div>
                    <div className="ml-6 space-y-1">
                      <div className="flex items-center">
                        <FileArchive className="h-4 w-4 mr-2 text-green-400" />
                        <span className="font-mono">ownable_bg.wasm</span>
                        <span className="text-gray-400 ml-2">
                          (WebAssembly binary)
                        </span>
                      </div>
                      <div className="flex items-center">
                        <FileJson className="h-4 w-4 mr-2 text-purple-400" />
                        <span className="font-mono">ownable.js</span>
                        <span className="text-gray-400 ml-2">
                          (JavaScript glue code)
                        </span>
                      </div>
                      <div className="flex items-center">
                        <FileJson className="h-4 w-4 mr-2 text-orange-400" />
                        <span className="font-mono">package.json</span>
                      </div>
                      <div className="flex items-center">
                        <FileJson className="h-4 w-4 mr-2 text-orange-400" />
                        <span className="font-mono">package-lock.json</span>
                      </div>
                      <div className="flex items-center">
                        <FileJson className="h-4 w-4 mr-2 text-yellow-400" />
                        <span className="font-mono">query_msg.json</span>
                      </div>
                      <div className="flex items-center">
                        <FileJson className="h-4 w-4 mr-2 text-yellow-400" />
                        <span className="font-mono">execute_msg.json</span>
                      </div>
                      <div className="flex items-center">
                        <FileJson className="h-4 w-4 mr-2 text-yellow-400" />
                        <span className="font-mono">instantiate_msg.json</span>
                      </div>
                      <div className="flex items-center">
                        <FileJson className="h-4 w-4 mr-2 text-yellow-400" />
                        <span className="font-mono">
                          external_event_msg.json
                        </span>
                      </div>
                      <div className="flex items-center">
                        <FileJson className="h-4 w-4 mr-2 text-yellow-400" />
                        <span className="font-mono">info_response.json</span>
                      </div>
                      <div className="flex items-center">
                        <FileJson className="h-4 w-4 mr-2 text-yellow-400" />
                        <span className="font-mono">metadata.json</span>
                      </div>
                      <div className="flex items-center">
                        <FileArchive className="h-4 w-4 mr-2 text-red-400" />
                        <span className="font-mono">index.html</span>
                        <span className="text-gray-400 ml-2">
                          (UI for the ownable)
                        </span>
                      </div>
                      <div className="flex items-center">
                        <FileJson className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-mono">config.json</span>
                        <span className="text-gray-400 ml-2">
                          (Configuration for the ownable)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {buildStatus === 'success' && (
                <div className="flex justify-end">
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Download Package
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="logs" className="flex-1 overflow-auto">
            <div className="bg-gray-900 p-4 rounded-md">
              <h3 className="text-lg font-medium mb-2">Build Logs</h3>
              <div className="font-mono text-sm bg-black p-4 rounded-md h-96 overflow-auto">
                {buildLog.length === 0 ? (
                  <div className="text-gray-500">
                    No logs yet. Start a build to see logs.
                  </div>
                ) : (
                  buildLog.map((log, index) => (
                    <div key={index} className="whitespace-pre-wrap mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
