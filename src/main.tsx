import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@mantine/core/styles.css';
import MapPage from './MapPage';

import { MantineProvider } from '@mantine/core';

createRoot(document.getElementById('root')!).render(
<StrictMode>
        <MantineProvider><MapPage /></MantineProvider>
        </StrictMode>

)
