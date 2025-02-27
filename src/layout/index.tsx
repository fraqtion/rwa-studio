// import React from 'react';
// import { Navbar } from './navbar';
// import { Editor } from '@/features/public/editor/editor';
// import { Homepage } from '@/features/public';
// import { Footer } from './footer';

// export default function AppLayout() {
//   const [showEditor, setShowEditor] = React.useState(false);

//   return (
//     <div className="min-h-screen flex flex-col">
//       <Navbar />
//       <main className="flex-1">
//         {showEditor ? (
//           <Editor onClose={() => setShowEditor(false)} />
//         ) : (
//           <Homepage onStartCreating={() => setShowEditor(true)} />
//         )}
//       </main>
//       {!showEditor && <Footer />}
//     </div>
//   );
// }

// import { Navbar } from './navbar';
// import Homepage from '@/features/public';
// import { Footer } from './footer';

// export default function AppLayout() {
//   return (
//     <div className="min-h-screen flex flex-col">
//       <Navbar />
//       <main className="flex-1">
//         <Homepage />
//       </main>
//       <Footer />
//     </div>
//   );
// }

import { Outlet } from 'react-router-dom';
import { Footer } from './footer';
import { Navbar } from './navbar';

export default function AppLayout() {
  return (
    <div>
      <Navbar />
      <main>
        <Outlet /> {/* This is where child routes like `/studio` will render */}
      </main>
      <Footer />
    </div>
  );
}
