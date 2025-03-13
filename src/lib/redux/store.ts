import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// Define the state interface
interface AppState {
  activeProject: string | null;
}

// Initial state
const initialState: AppState = {
  activeProject: null,
};

// Create a slice for project state
const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setActiveProject: (state, action: PayloadAction<string | null>) => {
      state.activeProject = action.payload;
    },
  },
});

// Configure persistence
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['activeProject'], // only persist activeProject
};

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, projectSlice.reducer);

// Configure the store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // disable serializable check for redux-persist
    }),
});

// Create persistor
export const persistor = persistStore(store);

// Export actions
export const { setActiveProject } = projectSlice.actions;

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
