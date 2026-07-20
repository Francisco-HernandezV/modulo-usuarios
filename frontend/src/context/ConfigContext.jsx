import { createContext, useState, useContext, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import api from "../services/api";

const ConfigContext = createContext({ config: {}, loading: true });

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .get("/admin/configuracion")
      .then((res) => { if (active) setConfig(res.data || {}); })
      .catch((err) => { console.error("No se pudo cargar la configuración de la tienda:", err); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const value = useMemo(() => ({ config, loading }), [config, loading]);

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

ConfigProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useConfig() {
  return useContext(ConfigContext);
}
