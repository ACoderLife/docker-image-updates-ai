import React from 'react';
import Button from '@mui/material/Button';
import { createDockerDesktopClient } from '@docker/extension-api-client';
import { Stack, TextField, Typography } from '@mui/material';


import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';


// Note: This line relies on Docker Desktop's presence as a host application.
// If you're running this React app in a browser, it won't work properly.
const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

export function App() {
  const [imageValues, setImageValues] = React.useState<string>();
  const [response, setResponse] = React.useState<string>();
  const ddClient = useDockerDesktopClient();

  //for the list of repositories to get ai updates for:
  const [updateAvailableRepos, setUpdateAvailableRepos] = React.useState<string[]>([]);

  interface DockerImage {
    Repository: string;
    Tag: string;
    Digest: string;
    // ... other properties from the Docker image you might need
  }

  async function fetchLocalImages(): Promise<DockerImage[]> {
    setImageValues(`Looking at your local Images...`);
    // Fetch local images using Docker Desktop Extension SDK    
    const images = await ddClient.docker.cli.exec('images', ['--format', '"{{json .}}"', '--digests']);
    const result = images.stdout.split('\n').filter(Boolean).map(line => JSON.parse(line));
    setImageValues(`Looking at your local Images... Found ` + result.length);
    // Split the output by newline and parse each line as JSON
    return images.stdout
      .trim() // Remove any leading/trailing whitespace
      .split('\n') // Split by newline to get each image JSON string
      .filter(line => line) // Filter out any empty lines
      .map(line => JSON.parse(line))
      .filter(image => image.Repository !== "<none>" && image.Tag !== "<none>"); // Filter out untagged images
  }

  async function getLatestTagDigest(repository: string): Promise<string | null> {
    setImageValues('Getting latest docker hub image matching ' + repository + '...');
    const url = 'https://registry.hub.docker.com/v2/repositories/library/' + repository + '/tags/latest';
    const response = await fetch(url);
    if (!response.ok) {
      setImageValues('No image found. ('+ response.status + ')');

      // If the tag does not exist or another error occurs, handle it appropriately
      return null;
    }
    const data = await response.json();
    // Assuming the first image in the array is the one we want (commonly amd64 architecture)
    return data.images?.[0]?.digest || null;
  }


  async function compareImages(): Promise<void> {
    const tagCache: { [repository: string]: string } = {};

    try {
      const localImages = await fetchLocalImages();

      for (const image of localImages) {
        setImageValues('image #' + localImages.indexOf(image));

        if (!tagCache[image.Repository]) {
          const latestDigest = await getLatestTagDigest(image.Repository);
          // If remoteTags is null, it means fetching tags failed; skip this image
          if (latestDigest === null) continue;

          tagCache[image.Repository] = latestDigest;

          // Compare the digests to see if the local 'latest' is actually the latest
          if (image.Digest !== latestDigest) {
            console.log(`Image ${image.Repository}:${image.Tag} has updates available.`);            
            setUpdateAvailableRepos(prev => [...prev, `${image.Repository}:${image.Tag}`]);
          } else {
            console.log(`Image ${image.Repository}:${image.Tag} is up to date.`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to compare images:', error);
      setImageValues(`Compare Images has an error.`);
    }
  }

  const fetchAndDisplayResponse = async () => {
    try {

      setResponse('Getting Changes for...' + checked.toString());
      
      const result = await ddClient.extension.vm?.service?.get('/hello');
      setResponse(JSON.stringify(result));

    } catch (err) {
      ddClient.desktopUI.toast.error('Backend Error')
    }
  };


  //Checkbox UI Stuff
  const [checked, setChecked] = React.useState<string[]>([]);

  const handleToggle = (value: string) => () => {
    const currentIndex = checked.indexOf(value);
    const newChecked = [...checked];

    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setChecked(newChecked);
  };



  return (
    <>
      <Typography variant="h3">Whats New With Your Image Dependencies</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
        This extension will gather your images and their dependencies and look up their changelogs.
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
        It will then use LangChain, Ollama, llma2, and Python to summerize.
      </Typography>
      <Stack direction="row" alignItems="start" spacing={2} sx={{ mt: 4 }}>
        <Button variant="contained" onClick={compareImages}>
          Load Current Images
        </Button>

        <TextField
          label="Current Images"
          sx={{ width: 480 }}
          disabled
          multiline
          variant="outlined"
          minRows={5}
          value={imageValues ?? ''}
        />
      </Stack>
      <List sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
        {updateAvailableRepos.map((repo, index) => {
          const labelId = `checkbox-list-label-${index}`;

          return (
            <ListItem key={repo} disablePadding>
              <ListItemButton role={undefined} onClick={handleToggle(repo)} dense>
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={checked.indexOf(repo) !== -1}
                    tabIndex={-1}
                    disableRipple
                    inputProps={{ 'aria-labelledby': labelId }}
                  />
                </ListItemIcon>
                <ListItemText id={labelId} primary={repo} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Stack direction="row" alignItems="start" spacing={2} sx={{ mt: 4 }}>
        <Button variant="contained" onClick={fetchAndDisplayResponse}>
          Load Changes 
        </Button>

        <TextField
          label="AI Response..."
          sx={{ width: 480 }}
          disabled
          multiline
          variant="outlined"
          minRows={5}
          value={response ?? ''}
        />
      </Stack>
    </>
  );
}
