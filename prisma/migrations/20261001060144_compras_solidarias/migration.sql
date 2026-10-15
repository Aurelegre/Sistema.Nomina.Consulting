-- Un único ABIERTO incluso ante escrituras concurrentes o SQL directo.
-- Los CERRADO producen NULL y pueden coexistir. Prisma no representa índices
-- funcionales en schema.prisma: conservar este índice en las migraciones SQL.
-- Si hay varios abiertos, resolverlos operativamente antes de migrar.
CREATE UNIQUE INDEX `uq_periodo_nomina_unico_abierto`
ON `periodo_nomina` ((CASE WHEN `estado` = 'ABIERTO' THEN 1 ELSE NULL END));

-- CreateTable
CREATE TABLE `compra_solidaria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleado_id` INTEGER NOT NULL,
    `periodo_id` INTEGER NOT NULL,
    `usuario_registro_id` INTEGER NOT NULL,
    `usuario_actualizacion_id` INTEGER NULL,
    `detalle` VARCHAR(500) NOT NULL,
    `monto` DECIMAL(12, 2) NOT NULL,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_actualizacion` DATETIME(3) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,

    INDEX `compra_solidaria_periodo_id_empleado_id_idx`(`periodo_id`, `empleado_id`),
    INDEX `compra_solidaria_empleado_id_idx`(`empleado_id`),
    INDEX `compra_solidaria_usuario_registro_id_idx`(`usuario_registro_id`),
    INDEX `compra_solidaria_usuario_actualizacion_id_idx`(`usuario_actualizacion_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `compra_solidaria` ADD CONSTRAINT `compra_solidaria_empleado_id_fkey` FOREIGN KEY (`empleado_id`) REFERENCES `empleado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compra_solidaria` ADD CONSTRAINT `compra_solidaria_periodo_id_fkey` FOREIGN KEY (`periodo_id`) REFERENCES `periodo_nomina`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compra_solidaria` ADD CONSTRAINT `compra_solidaria_usuario_registro_id_fkey` FOREIGN KEY (`usuario_registro_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `compra_solidaria` ADD CONSTRAINT `compra_solidaria_usuario_actualizacion_id_fkey` FOREIGN KEY (`usuario_actualizacion_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
