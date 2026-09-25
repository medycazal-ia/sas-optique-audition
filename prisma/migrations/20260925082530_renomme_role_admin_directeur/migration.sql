-- Renomme la valeur d'enum ADMIN -> DIRECTEUR (RENAME VALUE : ne touche pas
-- aux données, seulement à l'étiquette — les comptes existants avec le rôle
-- ADMIN deviennent DIRECTEUR sans rien à migrer manuellement).
ALTER TYPE "RoleUtilisateur" RENAME VALUE 'ADMIN' TO 'DIRECTEUR';
