-- "Foto" de teléfono y dirección del cliente al momento de crear el
-- presupuesto, mismo criterio que client_name/client_email: si el
-- cliente se edita o se borra después, el presupuesto ya enviado no
-- cambia. Nullable porque son opcionales en clientes (y porque los
-- presupuestos ya existentes no tienen de dónde sacarlos).

alter table presupuestos
  add column client_phone text,
  add column client_address text;
