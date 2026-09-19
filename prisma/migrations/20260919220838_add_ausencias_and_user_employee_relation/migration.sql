/*
  Warnings:

  - A unique constraint covering the columns `[empleado_id]` on the table `usuario` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `usuario` ADD COLUMN `empleado_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `ausencia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleado_id` INTEGER NOT NULL,
    `departamento_id` INTEGER NOT NULL,
    `fecha_inicio` DATE NOT NULL,
    `fecha_fin` DATE NOT NULL,
    `motivo` VARCHAR(500) NOT NULL,
    `a_cuenta_salario` BOOLEAN NOT NULL DEFAULT false,
    `estado` ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA', 'APLICADA_NOMINA') NOT NULL DEFAULT 'PENDIENTE',
    `usuario_resolucion_id` INTEGER NULL,
    `fecha_resolucion` DATETIME(3) NULL,
    `comentario_resolucion` VARCHAR(500) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_actualizacion` DATETIME(3) NOT NULL,
    `usuario_creacion_id` INTEGER NULL,

    INDEX `ausencia_empleado_id_idx`(`empleado_id`),
    INDEX `ausencia_departamento_id_idx`(`departamento_id`),
    INDEX `ausencia_estado_idx`(`estado`),
    INDEX `ausencia_fecha_inicio_fecha_fin_idx`(`fecha_inicio`, `fecha_fin`),
    INDEX `ausencia_usuario_creacion_id_idx`(`usuario_creacion_id`),
    INDEX `ausencia_usuario_resolucion_id_idx`(`usuario_resolucion_id`),
    INDEX `ausencia_departamento_id_estado_idx`(`departamento_id`, `estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `usuario_empleado_id_key` ON `usuario`(`empleado_id`);

-- AddForeignKey
ALTER TABLE `usuario` ADD CONSTRAINT `usuario_empleado_id_fkey` FOREIGN KEY (`empleado_id`) REFERENCES `empleado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ausencia` ADD CONSTRAINT `ausencia_empleado_id_fkey` FOREIGN KEY (`empleado_id`) REFERENCES `empleado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ausencia` ADD CONSTRAINT `ausencia_departamento_id_fkey` FOREIGN KEY (`departamento_id`) REFERENCES `departamento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ausencia` ADD CONSTRAINT `ausencia_usuario_resolucion_id_fkey` FOREIGN KEY (`usuario_resolucion_id`) REFERENCES `usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ausencia` ADD CONSTRAINT `ausencia_usuario_creacion_id_fkey` FOREIGN KEY (`usuario_creacion_id`) REFERENCES `usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
