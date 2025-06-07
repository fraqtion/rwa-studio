import { useNavigate } from 'react-router-dom';
import useOwnableStore from '../../stores/ownableStore';
import { useTemplates } from './use-templates';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useState } from 'react';
import { Folder } from '@/common/interfaces/files';

interface Template {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  type: string;
  tags: string[];
}

export default function SamplesPage() {
  const navigate = useNavigate();
  const { templates, isLoading } = useTemplates();
  const { importOwnable } = useOwnableStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  const handleUseTemplate = async (template: Template) => {
    try {
      // Create a unique project name
      const projectName = `${template.name}-${Date.now()}`;

      // Get the manifest for the template
      const manifestRes = await fetch(
        `/templates/${template.type}/manifest.json`,
      );
      if (!manifestRes.ok) {
        throw new Error(`Failed to load template manifest: ${template.type}`);
      }
      const manifest = await manifestRes.json();

      // Fetch all files in parallel
      const files = await Promise.all(
        manifest.files.map(async (filePath: string) => {
          const res = await fetch(`/templates/${template.type}/${filePath}`);
          if (!res.ok) {
            throw new Error(`Failed to fetch ${filePath}`);
          }
          const content = await res.text();
          return { path: filePath, content };
        }),
      );

      // Build the folder structure
      const folderStructure: Folder = {
        name: projectName,
        path: '/',
        files: {},
        folders: {},
      };

      // Process each file
      for (const file of files) {
        const parts = file.path.split('/');
        let current = folderStructure;

        // Create folders
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!current.folders[part]) {
            current.folders[part] = {
              name: part,
              path: `${current.path}${part}/`,
              files: {},
              folders: {},
            };
          }
          current = current.folders[part];
        }

        // Add file
        const fileName = parts[parts.length - 1];
        const fileType = fileName.endsWith('.rs')
          ? '.rs'
          : fileName.endsWith('.toml')
            ? '.toml'
            : fileName.endsWith('.json')
              ? '.json'
              : fileName.endsWith('.html')
                ? '.html'
                : '.txt';

        current.files[fileName] = {
          name: fileName,
          content: file.content,
          type: fileType,
          lastModified: new Date(),
          path: `${current.path}${fileName}`,
        };
      }

      // Import the template as a new project
      await importOwnable({
        name: projectName,
        folder: folderStructure,
      });

      // Navigate to the studio with the project name
      navigate(`/studio/${encodeURIComponent(projectName)}`);
    } catch (error) {
      console.error('Error using template:', error);
    }
  };

  const filteredTemplates = templates.filter((template: Template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag: string) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesCategory =
      selectedCategory === 'all' || template.category === selectedCategory;
    const matchesType =
      selectedType === 'all' || template.type === selectedType;

    return matchesSearch && matchesCategory && matchesType;
  });

  const categories = [
    'all',
    ...new Set(templates.map((t: Template) => t.category)),
  ];
  const types = ['all', ...new Set(templates.map((t: Template) => t.type))];

  if (isLoading) {
    return <div>Loading templates...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold">Templates</h1>
          <p className="text-muted-foreground">
            Choose a template to get started with your ownable project
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category: string) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {types.map((type: string) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template: Template) => (
              <Card key={template.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="aspect-video relative bg-muted rounded-lg overflow-hidden">
                    <img
                      src={template.image}
                      alt={template.name}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {template.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => handleUseTemplate(template)}
                    className="w-full"
                  >
                    Use Template
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
