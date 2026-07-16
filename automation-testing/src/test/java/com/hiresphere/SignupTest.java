package com.hiresphere;



import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.time.Duration;

public class SignupTest {

    WebDriver driver;

    @BeforeMethod
    public void setup() {

        driver = new ChromeDriver();
        driver.manage().window().maximize();

        driver.get("http://localhost:5173/signup");
    }

    @Test
    public void validSignupTest() {

        driver.findElement(By.id("name"))
                .sendKeys("Test User");

        driver.findElement(By.id("email"))
                .sendKeys("test" + System.currentTimeMillis() + "@gmail.com");

        driver.findElement(By.id("password"))
                .sendKeys("123456");

        driver.findElement(By.id("candidateRole"))
                .click();

        driver.findElement(By.id("signupBtn"))
                .click();

        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        wait.until(ExpectedConditions.urlContains("/dashboard"));

        Assert.assertTrue(driver.getCurrentUrl().contains("/dashboard"));
    }

    @Test
    public void duplicateEmailSignupTest() {

        driver.findElement(By.id("name"))
                .sendKeys("Navya");

        driver.findElement(By.id("email"))
                .sendKeys("navya@gmail.com");

        driver.findElement(By.id("password"))
                .sendKeys("123456");

        driver.findElement(By.id("candidateRole"))
                .click();

        driver.findElement(By.id("signupBtn"))
                .click();

        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

        WebElement error = wait.until(
                ExpectedConditions.visibilityOfElementLocated(
                        By.id("signupError")
                )
        );

        Assert.assertTrue(error.isDisplayed());
    }

    @Test
    public void emptyFieldsTest() {

        driver.findElement(By.id("signupBtn"))
                .click();

        WebElement name = driver.findElement(By.id("name"));

        Assert.assertEquals(
                name.getAttribute("validationMessage"),
                "Please fill out this field."
        );
    }

    @Test
    public void shortPasswordTest() {

        driver.findElement(By.id("name"))
                .sendKeys("Test");

        driver.findElement(By.id("email"))
                .sendKeys("short" + System.currentTimeMillis() + "@gmail.com");

        driver.findElement(By.id("password"))
                .sendKeys("123");

        driver.findElement(By.id("signupBtn"))
                .click();

        WebElement password = driver.findElement(By.id("password"));

        Assert.assertFalse(
                password.getAttribute("validationMessage").isEmpty()
        );
    }

    @AfterMethod
    public void tearDown() {

        //driver.quit();

    }
}