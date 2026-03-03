export const maskPhone = (value: string) => {
  if (!value) return "";
  let masked = value.replace(/\D/g, "");
  masked = masked.replace(/^(\d{2})(\d)/g, "($1) $2");
  masked = masked.replace(/(\d{5})(\d)/, "$1-$2");
  return masked.substring(0, 15);
};

export const validateFields = (data: Record<string, any>, requiredFields: string[]) => {
  const errors: Record<string, string> = {};
  requiredFields.forEach(field => {
    const value = data[field];
    if (!value || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0)) {
      errors[field] = "Este campo é obrigatório";
    }
  });
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const capitalizeName = (name: string) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};