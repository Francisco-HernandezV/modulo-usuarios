import { createContext, useState, useContext } from "react";

// Creamos el contexto
const SearchContext = createContext();

// Proveedor del contexto (envuelve a la app)
export function SearchProvider({ children }) {
    const [searchTerm, setSearchTerm] = useState("");

    return (
        <SearchContext.Provider value={{ searchTerm, setSearchTerm }}>
            {children}
        </SearchContext.Provider>
    );
}

// Hook personalizado para usar la búsqueda fácil
export function useSearch() {
    return useContext(SearchContext);
}