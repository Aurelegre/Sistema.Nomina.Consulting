-- CreateTable
CREATE TABLE `usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(100) NOT NULL,
    `nombre` VARCHAR(150) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `debe_cambiar_password` BOOLEAN NOT NULL DEFAULT true,
    `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    `rol_id` INTEGER NOT NULL,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_actualizacion` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuario_username_key`(`username`),
    INDEX `usuario_rol_id_idx`(`rol_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rol` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` VARCHAR(255) NULL,
    `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',

    UNIQUE INDEX `rol_codigo_key`(`codigo`),
    UNIQUE INDEX `rol_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permiso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(100) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` VARCHAR(255) NULL,

    UNIQUE INDEX `permiso_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rol_permiso` (
    `rol_id` INTEGER NOT NULL,
    `permiso_id` INTEGER NOT NULL,

    INDEX `rol_permiso_permiso_id_idx`(`permiso_id`),
    PRIMARY KEY (`rol_id`, `permiso_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sesion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token_hash` CHAR(64) NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `fecha_expiracion` DATETIME(3) NOT NULL,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sesion_token_hash_key`(`token_hash`),
    INDEX `sesion_usuario_id_idx`(`usuario_id`),
    INDEX `sesion_fecha_expiracion_idx`(`fecha_expiracion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `intento_login` (
    `username` VARCHAR(100) NOT NULL,
    `intentos` INTEGER NOT NULL DEFAULT 1,
    `ventana_hasta` DATETIME(3) NOT NULL,

    PRIMARY KEY (`username`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuario` ADD CONSTRAINT `usuario_rol_id_fkey` FOREIGN KEY (`rol_id`) REFERENCES `rol`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rol_permiso` ADD CONSTRAINT `rol_permiso_rol_id_fkey` FOREIGN KEY (`rol_id`) REFERENCES `rol`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rol_permiso` ADD CONSTRAINT `rol_permiso_permiso_id_fkey` FOREIGN KEY (`permiso_id`) REFERENCES `permiso`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sesion` ADD CONSTRAINT `sesion_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
