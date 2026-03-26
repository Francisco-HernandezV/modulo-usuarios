export const raspProtection = (req, res, next) => {
  const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR)\b)|('|--)/i;
  const xssPattern = /(<script>|<\/script>|<img|onload|onerror|javascript:)/i;

  const checkPayload = (data) => {
    if (!data) return false;
    const payload = JSON.stringify(data);
    return sqlInjectionPattern.test(payload) || xssPattern.test(payload);
  };

  const isAttack = checkPayload(req.query) || checkPayload(req.params) || checkPayload(req.body);

  if (isAttack) {
    console.error(`🚨 [RASP ALERT] Ataque bloqueado desde IP: ${req.ip} | Ruta: ${req.originalUrl}`);
    return res.status(403).json({
      error: "Acción bloqueada por el sistema RASP (Runtime Application Self-Protection). Se ha detectado un comportamiento malicioso."
    });
  }

  next();
};