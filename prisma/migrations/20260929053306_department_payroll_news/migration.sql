-- CreateTable
CREATE TABLE `novedad_nomina` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `solicitud_id` CHAR(36) NOT NULL,
    `empleado_id` INTEGER NOT NULL,
    `periodo_id` INTEGER NOT NULL,
    `departamento_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `tipo` ENUM('HORAS_EXTRAS', 'HORAS_DOBLES', 'PIEZAS', 'VENTAS') NOT NULL,
    `cantidad` DECIMAL(14, 2) NOT NULL,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `novedad_nomina_solicitud_id_key`(`solicitud_id`),
    INDEX `novedad_nomina_periodo_id_empleado_id_tipo_idx`(`periodo_id`, `empleado_id`, `tipo`),
    INDEX `novedad_nomina_departamento_id_periodo_id_idx`(`departamento_id`, `periodo_id`),
    INDEX `novedad_nomina_empleado_id_idx`(`empleado_id`),
    INDEX `novedad_nomina_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `novedad_nomina` ADD CONSTRAINT `novedad_nomina_empleado_id_fkey` FOREIGN KEY (`empleado_id`) REFERENCES `empleado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novedad_nomina` ADD CONSTRAINT `novedad_nomina_periodo_id_fkey` FOREIGN KEY (`periodo_id`) REFERENCES `periodo_nomina`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novedad_nomina` ADD CONSTRAINT `novedad_nomina_departamento_id_fkey` FOREIGN KEY (`departamento_id`) REFERENCES `departamento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `novedad_nomina` ADD CONSTRAINT `novedad_nomina_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
