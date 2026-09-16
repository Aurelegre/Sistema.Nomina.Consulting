-- CreateTable
CREATE TABLE `departamento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` ENUM('FINANZAS', 'PRODUCCION', 'LOGISTICA', 'RECURSOS_HUMANOS', 'MERCADEO') NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `cuenta_contable` VARCHAR(50) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_actualizacion` DATETIME(3) NOT NULL,

    UNIQUE INDEX `departamento_codigo_key`(`codigo`),
    UNIQUE INDEX `departamento_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Catálogo 2026. Las cuentas reales se configuran desde la aplicación.
INSERT INTO `departamento` (`codigo`, `nombre`, `fecha_actualizacion`) VALUES
('FINANZAS', 'Finanzas', CURRENT_TIMESTAMP(3)),
('PRODUCCION', 'Producción', CURRENT_TIMESTAMP(3)),
('LOGISTICA', 'Logística', CURRENT_TIMESTAMP(3)),
('RECURSOS_HUMANOS', 'Recursos Humanos', CURRENT_TIMESTAMP(3)),
('MERCADEO', 'Mercadeo', CURRENT_TIMESTAMP(3));
